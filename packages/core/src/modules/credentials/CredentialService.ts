/* eslint-disable @typescript-eslint/no-unused-vars */
import type { CredentialState } from '.'
import type { AgentMessage } from '../../agent/AgentMessage'
import type { Handler, HandlerInboundMessage } from '../../agent/Handler'
import type { InboundMessageContext } from '../../agent/models/InboundMessageContext'
import type { CredentialProtocolVersion } from './CredentialProtocolVersion'
import type {
  AcceptProposalOptions,
  AcceptRequestOptions,
  CredentialFormatType,
  NegotiateProposalOptions,
  OfferCredentialFormats,
  OfferCredentialOptions,
  ProposeCredentialOptions,
  RequestCredentialOptions,
} from './interfaces'
import type { CredentialExchangeRecord } from './repository'
import type { V1CredentialService } from './v1/V1CredentialService'
import type { CredentialProtocolMsgReturnType } from './v1/V1LegacyCredentialService'
import type { CredentialAckMessage, IssueCredentialMessage, RequestCredentialMessage } from './v1/messages'
import type { V2CredentialService } from './v2/V2CredentialService'
import type { CredentialFormatService, V2CredProposeOfferRequestFormat } from './v2/formats/CredentialFormatService'
import type { V2CredentialAckMessage } from './v2/messages/V2CredentialAckMessage'
import type { V2IssueCredentialMessage } from './v2/messages/V2IssueCredentialMessage'
import type { V2RequestCredentialMessage } from './v2/messages/V2RequestCredentialMessage'

export type CredentialServiceType = V1CredentialService | V2CredentialService

export abstract class CredentialService {
  abstract getVersion(): CredentialProtocolVersion

  abstract update(credentialRecord: CredentialExchangeRecord): Promise<void>

  abstract getFormats(
    credentialFormats: OfferCredentialFormats | V2CredProposeOfferRequestFormat
  ): CredentialFormatService[]
  // methods for proposal
  abstract createProposal(
    proposal: ProposeCredentialOptions
  ): Promise<{ credentialRecord: CredentialExchangeRecord; message: AgentMessage }>
  abstract processProposal(messageContext: HandlerInboundMessage<Handler>): Promise<CredentialExchangeRecord>
  abstract acceptProposal(
    proposal: AcceptProposalOptions
  ): Promise<{ credentialRecord: CredentialExchangeRecord; message: AgentMessage }>
  abstract negotiateProposal(
    credentialOptions: NegotiateProposalOptions
  ): Promise<{ credentialRecord: CredentialExchangeRecord; message: AgentMessage }>

  // methods for offer
  abstract createOffer(
    credentialOptions: OfferCredentialOptions
  ): Promise<{ credentialRecord: CredentialExchangeRecord; message: AgentMessage }>
  abstract processOffer(messageContext: HandlerInboundMessage<Handler>): Promise<CredentialExchangeRecord>

  abstract createOutOfBandOffer(
    credentialOptions: OfferCredentialOptions
  ): Promise<{ credentialRecord: CredentialExchangeRecord; message: AgentMessage }>

  // methods for request
  abstract createRequest(
    credentialRecord: CredentialExchangeRecord,
    options: RequestCredentialOptions
  ): Promise<CredentialProtocolMsgReturnType<AgentMessage>>

  abstract negotiateOffer(
    credentialOptions: ProposeCredentialOptions
  ): Promise<{ credentialRecord: CredentialExchangeRecord; message: AgentMessage }>

  // methods for issue

  abstract processRequest(
    messageContext: InboundMessageContext<RequestCredentialMessage | V2RequestCredentialMessage>
  ): Promise<CredentialExchangeRecord>

  // methods for issue
  abstract createCredential(
    credentialRecord: CredentialExchangeRecord,
    options?: AcceptRequestOptions
  ): Promise<CredentialProtocolMsgReturnType<IssueCredentialMessage | V2IssueCredentialMessage>>

  abstract processCredential(
    messageContext: InboundMessageContext<IssueCredentialMessage | V2IssueCredentialMessage>
  ): Promise<CredentialExchangeRecord>

  abstract createAck(
    credentialRecord: CredentialExchangeRecord
  ): Promise<CredentialProtocolMsgReturnType<CredentialAckMessage | V2CredentialAckMessage>>

  public getFormatService(credentialFormatType: CredentialFormatType): CredentialFormatService {
    throw Error('Not Implemented')
  }

  abstract updateState(credentialRecord: CredentialExchangeRecord, newState: CredentialState): Promise<void>
}
