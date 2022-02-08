import type { V1LegacyCredentialService } from '../..'
import type { DidCommMessageRepository } from '../../../../../src/storage'
import type { AgentConfig } from '../../../../agent/AgentConfig'
import type { Handler, HandlerInboundMessage } from '../../../../agent/Handler'
import type { CredentialResponseCoordinator } from '../../CredentialResponseCoordinator'
import type { CredentialExchangeRecord } from '../../repository/CredentialRecord'

import { createOutboundMessage, createOutboundServiceMessage } from '../../../../agent/helpers'
import { IssueCredentialMessage, RequestCredentialMessage } from '../messages'

export class IssueCredentialHandler implements Handler {
  private credentialService: V1LegacyCredentialService
  private agentConfig: AgentConfig
  private credentialResponseCoordinator: CredentialResponseCoordinator
  private didCommMessageRepository: DidCommMessageRepository
  public supportedMessages = [IssueCredentialMessage]

  public constructor(
    credentialService: V1LegacyCredentialService,
    agentConfig: AgentConfig,
    credentialResponseCoordinator: CredentialResponseCoordinator,
    didCommMessageRepository: DidCommMessageRepository
  ) {
    this.credentialService = credentialService
    this.agentConfig = agentConfig
    this.credentialResponseCoordinator = credentialResponseCoordinator
    this.didCommMessageRepository = didCommMessageRepository
  }

  public async handle(messageContext: HandlerInboundMessage<IssueCredentialHandler>) {
    const credentialRecord = await this.credentialService.processCredential(messageContext)
    const credentialMessage = await this.didCommMessageRepository.getAgentMessage({
      associatedRecordId: credentialRecord.id,
      messageClass: IssueCredentialMessage,
    })
    if (this.credentialResponseCoordinator.shouldAutoRespondToIssue(credentialRecord, credentialMessage)) {
      return await this.createAck(credentialRecord, credentialMessage, messageContext)
    }
  }

  private async createAck(
    record: CredentialExchangeRecord,
    credentialMessage: IssueCredentialMessage,
    messageContext: HandlerInboundMessage<IssueCredentialHandler>
  ) {
    this.agentConfig.logger.info(
      `Automatically sending acknowledgement with autoAccept on ${this.agentConfig.autoAcceptCredentials}`
    )
    const { message, credentialRecord } = await this.credentialService.createAck(record)

    const requestMessage = await this.didCommMessageRepository.getAgentMessage({
      associatedRecordId: credentialRecord.id,
      messageClass: RequestCredentialMessage,
    })
    if (messageContext.connection) {
      return createOutboundMessage(messageContext.connection, message)
    } else if (credentialMessage?.service && requestMessage?.service) {
      const recipientService = credentialMessage.service
      const ourService = requestMessage.service

      return createOutboundServiceMessage({
        payload: message,
        service: recipientService.toDidCommService(),
        senderKey: ourService.recipientKeys[0],
      })
    }

    this.agentConfig.logger.error(`Could not automatically create credential ack`)
  }
}
