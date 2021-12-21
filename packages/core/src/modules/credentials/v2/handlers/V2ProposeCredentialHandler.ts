import { AgentConfig } from "../../../../agent/AgentConfig"
import { Handler, HandlerInboundMessage } from "../../../../agent/Handler"
import { CredentialResponseCoordinator } from "../../CredentialResponseCoordinator"
import { V2CredentialService } from "../V2CredentialService"
import { V2ProposalCredentialMessage } from '../messages/V2ProposeCredentialMessage'

export class V2ProposeCredentialHandler implements Handler {
  private credentialService: V2CredentialService
  private agentConfig: AgentConfig
  private credentialAutoResponseCoordinator: CredentialResponseCoordinator
  public supportedMessages = [V2ProposalCredentialMessage]

  public constructor(
    credentialService: V2CredentialService,
    agentConfig: AgentConfig,
    responseCoordinator: CredentialResponseCoordinator
  ) {
    this.credentialAutoResponseCoordinator = responseCoordinator
    this.credentialService = credentialService
    this.agentConfig = agentConfig
  }

  public async handle(messageContext: HandlerInboundMessage<V2ProposeCredentialHandler>) {
    const credentialRecord = await this.credentialService.processProposal(messageContext)
    if (this.credentialAutoResponseCoordinator.shouldAutoRespondToProposal(credentialRecord)) {
      // return await this.createOffer(credentialRecord, messageContext) MJR-TODO
    }
  }
}