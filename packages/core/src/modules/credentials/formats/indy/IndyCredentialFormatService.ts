import type { CredentialExchangeRecord, CredentialRepository, OfferCredentialMessage } from '../..'
import type { EventEmitter } from '../../../../agent/EventEmitter'
import type { DidCommMessageRepository } from '../../../../storage'
import type { IndyHolderService, IndyIssuerService } from '../../../indy'
import type { IndyLedgerService } from '../../../ledger'
import type { CredentialPreviewAttribute } from '../../CredentialPreviewAttributes'
import type {
  AcceptProposalOptions,
  AcceptRequestOptions,
  NegotiateProposalOptions,
  OfferCredentialOptions,
  ProposeCredentialOptions,
  RequestCredentialOptions,
} from '../../interfaces'
import type { V2IssueCredentialMessage } from '../../protocol/v2/messages/V2IssueCredentialMessage'
import type { V2OfferCredentialMessage } from '../../protocol/v2/messages/V2OfferCredentialMessage'
import type { V2RequestCredentialMessage } from '../../protocol/v2/messages/V2RequestCredentialMessage'
import type {
  CredPropose,
  CredAttachmentFormats,
  CredentialFormatSpec,
  CredProposeOfferRequestFormat,
} from '../CredentialFormatService'
import type { MetaDataService } from '../MetaDataService'
import type { CredentialDefinitionFormat } from '../models/CredentialFormatServiceOptions'
import type { Cred, CredDef, CredOffer, CredReq } from 'indy-sdk'

import { AutoAcceptCredential, CredentialMetadataKeys, CredentialUtils } from '../..'
import { Attachment, AttachmentData } from '../../../../decorators/attachment/Attachment'
import { JsonEncoder } from '../../../../utils/JsonEncoder'
import { CredentialResponseCoordinator } from '../../CredentialResponseCoordinator'
import { CredentialProblemReportError, CredentialProblemReportReason } from '../../errors'
import { V2CredentialPreview } from '../../protocol/v2/V2CredentialPreview'
import { V2ProposeCredentialMessage } from '../../protocol/v2/messages/V2ProposeCredentialMessage'
import { CredentialFormatService } from '../CredentialFormatService'

import { IndyMetaDataService } from './IndyMetaDataService'

// this is the base64 encoded data payload for [Indy] credential proposal

export class IndyCredentialFormatService extends CredentialFormatService {
  private indyIssuerService?: IndyIssuerService
  private indyLedgerService?: IndyLedgerService
  private indyHolderService?: IndyHolderService
  protected credentialRepository: CredentialRepository // protected as in base class
  private metaDataService: MetaDataService
  private didCommMessageRepository: DidCommMessageRepository

  public constructor(
    credentialRepository: CredentialRepository,
    eventEmitter: EventEmitter,
    didCommMessageRepository: DidCommMessageRepository,
    indyIssuerService?: IndyIssuerService,
    indyLedgerService?: IndyLedgerService,
    indyHolderService?: IndyHolderService
  ) {
    super(credentialRepository, eventEmitter)
    this.credentialRepository = credentialRepository
    this.indyIssuerService = indyIssuerService
    this.indyLedgerService = indyLedgerService
    this.indyHolderService = indyHolderService
    this.metaDataService = new IndyMetaDataService(credentialRepository, eventEmitter)
    this.didCommMessageRepository = didCommMessageRepository
  }

  public getMetaDataService(): MetaDataService {
    return this.metaDataService
  }
  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param proposal The object containing all the options for the proposed credential
   * @param messageType the type of message which can be Indy, JsonLd etc eg "CRED_20_PROPOSAL"
   * @returns object containing associated attachment, formats and filtersAttach elements
   *
   */
  public createProposalAttachFormats(proposal: ProposeCredentialOptions): CredAttachmentFormats {
    // loop through all formats present in this proposal: we can get this from the
    // object keys in the credential format within the proposal
    const formats: CredentialFormatSpec = {
      attachId: this.generateId(),
      format: 'hlindy/cred-filter@v2.0',
    }

    const filtersAttach: Attachment = this.getFormatData(
      proposal.credentialFormats.indy?.payload.credentialPayload,
      formats.attachId
    )
    const { previewWithAttachments } = this.getCredentialLinkedAttachments(proposal)

    return { formats, filtersAttach, previewWithAttachments }
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param proposal The object containing all the options for the credential offer
   * @param messageType the type of message which can be Indy, JsonLd etc eg "CRED_20_OFFER"
   * @returns object containing associated attachment, formats and offersAttach elements
   *
   */
  public createOfferAttachFormats(
    proposal: AcceptProposalOptions,
    offer: CredProposeOfferRequestFormat
  ): CredAttachmentFormats {
    const formats: CredentialFormatSpec = {
      attachId: this.generateId(),
      format: 'hlindy/cred-abstract@v2.0',
    }

    // if the proposal has an attachment Id use that, otherwise the generated id of the formats object
    const attachmentId = proposal.attachId ? proposal.attachId : formats.attachId
    const offersAttach: Attachment = this.getFormatData(offer.indy?.payload.credentialPayload, attachmentId)

    return { formats, offersAttach }
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param requestOptions The object containing all the options for the credential request
   * @param credentialRecord the credential record containing the offer from which this request
   * is derived
   * @returns object containing associated attachment, formats and requestAttach elements
   *
   */
  public async createRequestAttachFormats(
    requestOptions: RequestCredentialOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<CredAttachmentFormats> {
    if (requestOptions.offer) {
      // format service -> get the credential definition and create the [indy] credential request
      requestOptions.credentialDefinition = await this.getCredentialDefinition(requestOptions.offer)
      const credOfferRequest: CredProposeOfferRequestFormat = await this.createRequest(requestOptions)

      const formats: CredentialFormatSpec = {
        attachId: this.generateId(),
        format: 'hlindy/cred-req@v2.0',
      }

      const attachmentId = requestOptions.attachId ? requestOptions.attachId : formats.attachId
      const requestAttach: Attachment = this.getFormatData(
        credOfferRequest.indy?.payload.credentialPayload,
        attachmentId
      )
      return { formats, requestAttach, credOfferRequest }
    } else {
      throw Error(`Indy cannot begin credential exchange without offer; credential record = ${credentialRecord.id}`)
    }
  }

  /**
   * Extract the payload from the message attachment data and turn that into a V2CredRequestFormat object. For
   * Indy this will be a CredOffer or CredReq object embedded threrein.n
   * @param data the {@link Attachment} object which contains the message payload
   * @return V2CredRequestFormat object containing the Indy SDK CredReq, note meta data does not
   * seem to be needed here (or even present in the payload)
   */
  public getCredentialPayload<T>(data: Attachment): CredProposeOfferRequestFormat {
    const credentialOfferJson: T = data.getDataAsJson<T>() as T
    return {
      indy: {
        payload: {
          credentialPayload: credentialOfferJson,
        },
      },
    }
  }

  /**
   * Retrieve the credential definition from the ledger, currently Indy SDK but
   * will have other possibilities in the future
   * @param offer the offer object containing the id of the credential definition on on the ledger
   * @return CredentialDefinition in v2 format (currently only Indy {@link CredDef})
   */
  public async getCredentialDefinition(
    offer: CredProposeOfferRequestFormat
  ): Promise<CredentialDefinitionFormat | undefined> {
    let indyCredDef: CredDef

    if (this.indyLedgerService && offer.indy?.payload.credentialPayload) {
      if (offer.indy.payload.credentialPayload?.cred_def_id) {
        indyCredDef = await this.indyLedgerService.getCredentialDefinition(
          offer.indy.payload.credentialPayload?.cred_def_id
        )
        return {
          indy: {
            credDef: indyCredDef,
          },
        }
      }
    }
  }

  /**
   * Get linked attachments for indy format from a proposal message. This allows attachments
   * to be copied across to old style credential records
   *
   * @param proposal ProposeCredentialOptions object containing (optionally) the linked attachments
   * @return array of linked attachments or undefined if none present
   */
  private getCredentialLinkedAttachments(proposal: ProposeCredentialOptions): {
    attachments: Attachment[] | undefined
    previewWithAttachments: V2CredentialPreview
  } {
    // Add the linked attachments to the credentialProposal
    const credPropose: CredPropose = proposal.credentialFormats.indy?.payload.credentialPayload as CredPropose

    let attachments: Attachment[] | undefined
    let previewWithAttachments: V2CredentialPreview = new V2CredentialPreview({
      attributes: credPropose.attributes ? credPropose.attributes : [],
    })
    if (proposal.credentialFormats.indy && credPropose.linkedAttachments) {
      // there are linked attachments so transform into the attribute field of the CredentialPreview object for
      // this proposal
      if (credPropose.attributes && credPropose.credentialDefinitionId) {
        previewWithAttachments = CredentialUtils.createAndLinkAttachmentsToPreview(
          credPropose.linkedAttachments,
          new V2CredentialPreview({
            attributes: credPropose.attributes,
          })
        )
      }
      attachments = credPropose.linkedAttachments.map((linkedAttachment) => linkedAttachment.attachment)

      credPropose.credentialDefinitionId = this.getCredentialDefinitionId(proposal)

      proposal.credentialFormats.indy.payload.credentialPayload = credPropose
    }
    return { attachments, previewWithAttachments }
  }

  /**
   *
   * @param options Gets the credential definition id if present for an indy credential
   * @returns the credential definition id for this credential
   */
  private getCredentialDefinitionId(options: ProposeCredentialOptions): string | undefined {
    const credPropose: CredPropose = options.credentialFormats.indy?.payload.credentialPayload as CredPropose
    return credPropose.credentialDefinitionId
  }
  /**
   * Get attributes for indy format from a proposal message. This allows attributes
   * to be copied across to old style credential records
   *
   * @param proposal ProposeCredentialOptions object containing (optionally) the attributes
   * @return array of attributes or undefined if none present
   */
  public getCredentialAttributes(proposal: ProposeCredentialOptions): CredentialPreviewAttribute[] | undefined {
    const credPropose: CredPropose = proposal.credentialFormats.indy?.payload as CredPropose
    return credPropose.attributes
  }

  /**
   *
   * Returns an object of type {@link Attachment} for use in credential exchange messages.
   * It looks up the correct format identifier and encodes the data as a base64 attachment.
   *
   * @param data The data to include in the attach object
   * @param id the attach id from the formats component of the message
   * @returns attachment to the credential proposal
   */
  public getFormatData(data: unknown, id: string): Attachment {
    const attachment: Attachment = new Attachment({
      id,
      mimeType: 'application/json',
      data: new AttachmentData({
        base64: JsonEncoder.toBase64(data),
      }),
    })
    return attachment
  }

  /**
   * Create a credential offer for the given credential definition id.
   *
   * @param credentialDefinitionId The credential definition to create an offer for
   * @returns The created credential offer
   */
  public async createOffer(
    proposal: AcceptProposalOptions | NegotiateProposalOptions | OfferCredentialOptions
  ): Promise<CredProposeOfferRequestFormat> {
    if (this.indyIssuerService && proposal.credentialFormats?.indy?.credentialDefinitionId) {
      const credOffer: CredOffer = await this.indyIssuerService.createCredentialOffer(
        proposal.credentialFormats.indy.credentialDefinitionId
      )
      return {
        indy: {
          payload: {
            credentialPayload: credOffer, // old v1 object from Indy SDK
          },
        },
      }
    }
    if (!this.indyIssuerService) {
      throw new Error('Missing Indy Issuer Service')
    } else {
      throw new Error('Missing Credential Definition id')
    }
  }

  /**
   * Create a credential offer for the given credential definition id.
   *
   * @param options RequestCredentialOptions the config options for the credential request
   * @throws Error if unable to create the request
   * @returns The created credential offer
   */
  private async createRequest(options: RequestCredentialOptions): Promise<CredProposeOfferRequestFormat> {
    if (
      this.indyHolderService &&
      options.holderDid &&
      options.offer &&
      options.offer.indy?.payload.credentialPayload &&
      options.credentialDefinition &&
      options.credentialDefinition.indy?.credDef
    ) {
      const credoffer: CredOffer = options.offer.indy?.payload.credentialPayload as CredOffer
      const [credReq, credReqMetadata] = await this.indyHolderService.createCredentialRequest({
        holderDid: options.holderDid,
        credentialOffer: credoffer,
        credentialDefinition: options.credentialDefinition.indy?.credDef,
      })
      const request: CredProposeOfferRequestFormat = {
        indy: {
          payload: {
            credentialPayload: credReq,
            requestMetaData: credReqMetadata,
          },
        },
      }
      return request
    }
    throw Error('Unable to create Credential Request')
  }

  /**
   * Method to insert a preview object into a proposal. This can occur when we retrieve a
   * preview object as part of the stored credential record and need to add it to the
   * proposal object used for processing credential proposals
   * @param proposal the proposal object needed for acceptance processing
   * @param preview the preview containing stored attributes
   * @returns proposal object with extra preview attached
   */
  public setPreview(proposal: AcceptProposalOptions, preview: V2CredentialPreview): AcceptProposalOptions {
    if (proposal.credentialFormats.indy) {
      proposal.credentialFormats.indy.attributes = preview.attributes
    }
    return proposal
  }

  public async processProposal(
    options: AcceptProposalOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<AcceptProposalOptions> {
    let proposalMessage
    try {
      proposalMessage = await this.didCommMessageRepository.getAgentMessage({
        associatedRecordId: credentialRecord.id,
        messageClass: V2ProposeCredentialMessage,
      })
    } catch (RecordNotFoundError) {
      // can happen in normal processing
    }
    if (proposalMessage && proposalMessage.credentialProposal?.attributes) {
      const proposeMessage = proposalMessage as V2ProposeCredentialMessage

      let credPropose
      const indyProposeFormat = proposeMessage.formats.find((f) => f.format.includes('indy'))

      if (indyProposeFormat && proposeMessage.messageAttachment) {
        const attachment = proposeMessage.messageAttachment.find(
          (attachment) => attachment.id === indyProposeFormat.attachId
        )
        if (attachment) {
          credPropose = this.getCredentialPayload<CredPropose>(attachment).indy?.payload
            .credentialPayload as CredPropose
        } else {
          throw Error(`Missing data payload in attachment in credential Record ${credentialRecord.id}`)
        }
      }

      if (proposeMessage && proposeMessage.credentialProposal) {
        options.credentialFormats = {
          indy: {
            attributes: proposeMessage.credentialProposal.attributes,
            credentialDefinitionId: credPropose?.credentialDefinitionId,
          },
        }
        return options
      }
    }
    throw Error('Unable to create accept proposal options object')
  }

  /**
   * Gets the attachment object for a given attachId. We need to get out the correct attachId for
   * indy and then find the corresponding attachment (if there is one)
   * @param message Gets the
   * @returns The Attachment if found or undefined
   */
  public getAttachment(
    message:
      | V2RequestCredentialMessage
      | V2ProposeCredentialMessage
      | V2OfferCredentialMessage
      | V2IssueCredentialMessage
  ): Attachment | undefined {
    const indyFormat = message.formats.find((f) => f.format.includes('indy'))
    const attachment = message.messageAttachment?.find((attachment) => attachment.id === indyFormat?.attachId)
    return attachment
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param requestOptions The object containing all the options for the credential request
   * @param credentialRecord the credential record containing the offer from which this request
   * is derived
   * @returns object containing associated attachment, formats and requestAttach elements
   *
   */
  // public async createIssueCredentialAttachFormats(credentialRecord: CredentialRecord, options: AcceptRequestOptions) {

  public async createIssueAttachFormats(
    options: AcceptRequestOptions,
    record: CredentialExchangeRecord
  ): Promise<CredAttachmentFormats> {
    if (!options.offer || !options.offer.indy?.payload.credentialPayload) {
      throw Error(`Missing offer from options for record ${record.id}`)
    }

    if (!options.request) {
      throw Error(`Missing request from options for record ${record.id}`)
    }
    // Assert credential attributes
    const credentialAttributes = record.credentialAttributes
    if (!credentialAttributes) {
      throw new CredentialProblemReportError(
        `Missing required credential attribute values on credential record with id ${record.id}`,
        { problemCode: CredentialProblemReportReason.IssuanceAbandoned }
      )
    }

    const credOffer: CredOffer = options.offer.indy?.payload.credentialPayload as CredOffer
    const credRequest: CredReq = options.request.indy?.payload.credentialPayload as CredReq

    if (this.indyIssuerService) {
      const [credential] = await this.indyIssuerService.createCredential({
        credentialOffer: credOffer,
        credentialRequest: credRequest,
        credentialValues: CredentialUtils.convertAttributesToValues(credentialAttributes),
      })

      const formats: CredentialFormatSpec = {
        attachId: this.generateId(),
        format: 'hlindy/cred-abstract@v2.0',
      }

      const attachmentId = options.attachId ? options.attachId : formats.attachId
      const issueAttachment: Attachment = this.getFormatData(credential, attachmentId)
      return { formats, credentialsAttach: issueAttachment }
    }

    throw Error('Missing Indy Issuer Service for createIssueCredentialAttachFormats')
  }
  /**
   * Processes an incoming credential - retreive metadata, retrievepayload and store it in the Indy wallet
   * @param message the issue credential message
   */
  public async processCredential(
    issueCredentialMessage: V2IssueCredentialMessage,
    credentialRecord: CredentialExchangeRecord
  ): Promise<void> {
    const credentialRequestMetadata = credentialRecord.metadata.get(CredentialMetadataKeys.IndyRequest)

    if (!credentialRequestMetadata) {
      throw new CredentialProblemReportError(
        `Missing required request metadata for credential with id ${credentialRecord.id}`,
        { problemCode: CredentialProblemReportReason.IssuanceAbandoned }
      )
    }
    if (!issueCredentialMessage.messageAttachment) {
      throw Error('Missing credential message attachments')
    }
    // get the credential from the payload

    let indyCredential: Cred | undefined

    const indyCredentialFormat = issueCredentialMessage.formats.find((f) => f.format.includes('indy'))

    if (indyCredentialFormat) {
      const attachment = issueCredentialMessage.messageAttachment.find(
        (attachment) => attachment.id === indyCredentialFormat.attachId
      )
      if (attachment) {
        indyCredential = this.getCredentialPayload<Cred>(attachment).indy?.payload.credentialPayload as Cred
      } else {
        throw Error(`Missing data payload in attachment in credential Record ${credentialRecord.id}`)
      }
    }

    if (!indyCredential) {
      throw new CredentialProblemReportError(
        `Missing required base64 or json encoded attachment data for credential with thread id ${issueCredentialMessage.threadId}`,
        { problemCode: CredentialProblemReportReason.IssuanceAbandoned }
      )
    }

    if (!this.indyLedgerService) {
      throw new CredentialProblemReportError(
        `Missing required indy ledger service for credential with thread id ${issueCredentialMessage.threadId}`,
        { problemCode: CredentialProblemReportReason.IssuanceAbandoned }
      )
    }
    const credentialDefinition = await this.indyLedgerService.getCredentialDefinition(indyCredential.cred_def_id)

    if (!this.indyHolderService) {
      throw new CredentialProblemReportError(
        `Missing required indy holder service for credential with thread id ${issueCredentialMessage.threadId}`,
        { problemCode: CredentialProblemReportReason.IssuanceAbandoned }
      )
    }
    const credentialId = await this.indyHolderService.storeCredential({
      credentialId: this.generateId(),
      credentialRequestMetadata,
      credential: indyCredential,
      credentialDefinition,
    })
    credentialRecord.credentialId = credentialId
  }

  /**
 * Checks whether it should automatically respond to a proposal. Moved from CredentialResponseCoordinator
 * as this contains format-specific logic
 * @param credentialRecord The credential record for which we are testing whether or not to auto respond
 * @param agentConfig config object for the agent, used to hold auto accept state for the agent
 * @returns true if we should auto respond, false otherwise

 */
  public shouldAutoRespondToProposalNEW(
    credentialRecord: CredentialExchangeRecord,
    autoAcceptType: AutoAcceptCredential,
    proposeMessageAttributes?: CredentialPreviewAttribute[],
    proposePayload?: CredProposeOfferRequestFormat,
    offerPayload?: CredProposeOfferRequestFormat
  ): boolean {
    const autoAccept = CredentialResponseCoordinator.composeAutoAccept(
      credentialRecord.autoAcceptCredential,
      autoAcceptType
    )

    if (autoAccept === AutoAcceptCredential.Always) {
      return true
    } else if (autoAccept === AutoAcceptCredential.ContentApproved) {
      return (
        this.areProposalValuesValidNEW(credentialRecord, proposeMessageAttributes) &&
        this.areProposalAndOfferDefinitionIdEqualNEW(proposePayload, offerPayload)
      )
    }
    return false
  }

  /**
   * Checks whether it should automatically respond to an offer. Moved from CredentialResponseCoordinator
   * as this contains format-specific logic
   * @param credentialRecord The credential record for which we are testing whether or not to auto respond
   * @param autoAcceptType auto accept type for this credential exchange - normal auto or content approved
   * @returns true if we should auto respond, false otherwise

   */
  public shouldAutoRespondToOfferNEW(
    credentialRecord: CredentialExchangeRecord,
    autoAcceptType: AutoAcceptCredential,
    offerPayload?: CredProposeOfferRequestFormat,
    offerMessageAttributes?: CredentialPreviewAttribute[],
    proposePayload?: CredProposeOfferRequestFormat
  ): boolean {
    const autoAccept = CredentialResponseCoordinator.composeAutoAccept(
      credentialRecord.autoAcceptCredential,
      autoAcceptType
    )

    if (autoAccept === AutoAcceptCredential.Always) {
      return true
    } else if (autoAccept === AutoAcceptCredential.ContentApproved) {
      return (
        this.areOfferValuesValidNEW(credentialRecord, offerMessageAttributes) &&
        this.areProposalAndOfferDefinitionIdEqualNEW(proposePayload, offerPayload)
      )
    }
    return false
  }

  /**
 * Checks whether it should automatically respond to a request. Moved from CredentialResponseCoordinator
 * as this contains format-specific logic
 * @param credentialRecord The credential record for which we are testing whether or not to auto respond
 * @param autoAcceptType auto accept type for this credential exchange - normal auto or content approved
 * @returns true if we should auto respond, false otherwise

 */
  public shouldAutoRespondToRequestNEW(
    credentialRecord: CredentialExchangeRecord,
    autoAcceptType: AutoAcceptCredential,
    requestPayload?: CredProposeOfferRequestFormat,
    offerPayload?: CredProposeOfferRequestFormat,
    proposePayload?: CredProposeOfferRequestFormat
  ): boolean {
    const autoAccept = CredentialResponseCoordinator.composeAutoAccept(
      credentialRecord.autoAcceptCredential,
      autoAcceptType
    )

    if (autoAccept === AutoAcceptCredential.Always) {
      return true
    } else if (autoAccept === AutoAcceptCredential.ContentApproved) {
      return this.isRequestDefinitionIdValidNEW(requestPayload, offerPayload, proposePayload)
    }
    return false
  }

  /**
   * Checks whether it should automatically respond to a request. Moved from CredentialResponseCoordinator
   * as this contains format-specific logic
   * @param credentialRecord The credential record for which we are testing whether or not to auto respond
   * @param autoAcceptType auto accept type for this credential exchange - normal auto or content approved
   * @returns true if we should auto respond, false otherwise
   */
  public shouldAutoRespondToIssueNEW(
    credentialRecord: CredentialExchangeRecord,
    autoAcceptType: AutoAcceptCredential,
    credentialPayload?: CredProposeOfferRequestFormat
  ): boolean {
    const autoAccept = CredentialResponseCoordinator.composeAutoAccept(
      credentialRecord.autoAcceptCredential,
      autoAcceptType
    )

    if (autoAccept === AutoAcceptCredential.Always) {
      return true
    } else if (autoAccept === AutoAcceptCredential.ContentApproved) {
      return this.areCredentialValuesValidNEW(credentialRecord, credentialPayload)
    }
    return false
  }

  private areProposalValuesValidNEW(
    credentialRecord: CredentialExchangeRecord,
    proposeMessageAttributes?: CredentialPreviewAttribute[]
  ) {
    const { credentialAttributes } = credentialRecord

    if (proposeMessageAttributes && credentialAttributes) {
      const proposeValues = CredentialUtils.convertAttributesToValues(proposeMessageAttributes)
      const defaultValues = CredentialUtils.convertAttributesToValues(credentialAttributes)
      if (CredentialUtils.checkValuesMatch(proposeValues, defaultValues)) {
        return true
      }
    }
    return false
  }

  private areProposalAndOfferDefinitionIdEqualNEW(
    proposePayload?: CredProposeOfferRequestFormat,
    offerPayload?: CredProposeOfferRequestFormat
  ) {
    const credPropose = proposePayload?.indy?.payload.credentialPayload as CredPropose | undefined
    const credOffer = offerPayload?.indy?.payload.credentialPayload as CredOffer | undefined

    const proposalCredentialDefinitionId = credPropose?.credentialDefinitionId
    const offerCredentialDefinitionId = credOffer?.cred_def_id

    return proposalCredentialDefinitionId === offerCredentialDefinitionId
  }

  private areOfferValuesValidNEW(
    credentialRecord: CredentialExchangeRecord,
    offerMessageAttributes?: CredentialPreviewAttribute[]
  ) {
    const { credentialAttributes } = credentialRecord

    if (offerMessageAttributes && credentialAttributes) {
      const offerValues = CredentialUtils.convertAttributesToValues(offerMessageAttributes)
      const defaultValues = CredentialUtils.convertAttributesToValues(credentialAttributes)
      if (CredentialUtils.checkValuesMatch(offerValues, defaultValues)) {
        return true
      }
    }
    return false
  }

  private areCredentialValuesValidNEW(
    credentialRecord: CredentialExchangeRecord,
    credentialPayload?: CredProposeOfferRequestFormat
  ) {
    if (credentialRecord.credentialAttributes && credentialPayload) {
      const indyCredential: Cred = credentialPayload.indy?.payload.credentialPayload as Cred

      if (!indyCredential) {
        throw Error(`Missing required base64 encoded attachment data for credential`)
        return false
      }

      const credentialMessageValues = indyCredential.values

      const defaultValues = CredentialUtils.convertAttributesToValues(credentialRecord.credentialAttributes)

      if (CredentialUtils.checkValuesMatch(credentialMessageValues, defaultValues)) {
        return true
      }
    }
    return false
  }
  private isRequestDefinitionIdValidNEW(
    requestPayload?: CredProposeOfferRequestFormat,
    offerPayload?: CredProposeOfferRequestFormat,
    proposePayload?: CredProposeOfferRequestFormat
  ) {
    const indyCredentialRequest: CredReq = requestPayload?.indy?.payload.credentialPayload as CredReq
    const indyCredentialProposal: CredPropose | undefined = proposePayload?.indy?.payload
      .credentialPayload as CredPropose
    const indyCredentialOffer: CredOffer | undefined = offerPayload?.indy?.payload.credentialPayload as CredOffer

    if (indyCredentialProposal || indyCredentialOffer) {
      const previousCredentialDefinitionId =
        indyCredentialOffer?.cred_def_id ?? indyCredentialProposal?.credentialDefinitionId

      if (previousCredentialDefinitionId === indyCredentialRequest.cred_def_id) {
        return true
      }
      return false
    }
    return false
  }
}