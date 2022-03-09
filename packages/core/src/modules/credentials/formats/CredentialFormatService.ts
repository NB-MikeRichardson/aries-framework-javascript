import type { AgentMessage } from '../../../../src/agent/AgentMessage'
import type { EventEmitter } from '../../../agent/EventEmitter'
import type { Attachment } from '../../../decorators/attachment/Attachment'
import type {
  AcceptCredentialOptions,
  AcceptProposalOptions,
  AcceptRequestOptions,
  ProposeCredentialOptions,
  RequestCredentialOptions,
} from '../interfaces'
import type { CredentialPreviewAttribute } from '../models/CredentialPreviewAttributes'
import type { V1CredentialPreview } from '../protocol/v1/V1CredentialPreview'
import type { CredentialExchangeRecord, CredentialRepository } from '../repository'
import type {
  CredentialAttachmentFormats,
  HandlerAutoAcceptOptions,
  OfferAttachmentFormats,
  ProposeAttachmentFormats,
} from './models/CredentialFormatServiceOptions'

import { uuid } from '../../../utils/uuid'

export abstract class CredentialFormatService {
  protected credentialRepository: CredentialRepository
  protected eventEmitter: EventEmitter

  public constructor(credentialRepository: CredentialRepository, eventEmitter: EventEmitter) {
    this.credentialRepository = credentialRepository
    this.eventEmitter = eventEmitter
  }

  abstract createProposal(options: ProposeCredentialOptions): ProposeAttachmentFormats

  abstract processProposal(
    options: AcceptProposalOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<AcceptProposalOptions>

  abstract createOffer(options: AcceptProposalOptions): Promise<OfferAttachmentFormats>

  abstract processOffer(options: AcceptProposalOptions, credentialRecord: CredentialExchangeRecord): void

  abstract createRequest(
    options: RequestCredentialOptions,
    credentialRecord: CredentialExchangeRecord,
    holderDid?: string // temporary workaround as this is not in the options object
  ): Promise<CredentialAttachmentFormats>

  abstract processRequest(options: RequestCredentialOptions, credentialRecord: CredentialExchangeRecord): void

  abstract createCredential(
    options: AcceptRequestOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<CredentialAttachmentFormats>

  abstract processCredential(
    options: AcceptCredentialOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<void>

  // helper methods

  abstract getFormatData(data: unknown, id: string): Attachment
  abstract getCredentialAttributes(proposal: ProposeCredentialOptions): CredentialPreviewAttribute[] | undefined
  abstract setPreview(proposal: AcceptProposalOptions, preview: V1CredentialPreview): AcceptProposalOptions

  abstract getAttachment(message: AgentMessage): Attachment | undefined

  public generateId(): string {
    return uuid()
  }

  abstract shouldAutoRespondToProposal(options: HandlerAutoAcceptOptions): boolean
  abstract shouldAutoRespondToRequest(options: HandlerAutoAcceptOptions): boolean
  abstract shouldAutoRespondToCredential(options: HandlerAutoAcceptOptions): boolean
}
