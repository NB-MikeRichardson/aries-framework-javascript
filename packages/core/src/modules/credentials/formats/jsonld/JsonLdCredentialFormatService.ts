import type { Attachment, AttachmentData } from '../../../../decorators/attachment/Attachment'
import type { SignCredentialOptions } from '../../../vc/models/W3cCredentialServiceOptions'
import type { W3cCredentialRecord } from '../../../vc/models/credential/W3cCredentialRecord'
import type {
  ServiceAcceptCredentialOptions,
  ServiceAcceptProposalOptions,
  ServiceAcceptRequestOptions,
  ServiceOfferCredentialOptions,
} from '../../CredentialServiceOptions'
import type { ProposeCredentialOptions, RequestCredentialOptions } from '../../CredentialsModuleOptions'
import type { CredentialExchangeRecord } from '../../repository'
import type {
  FormatServiceCredentialAttachmentFormats,
  FormatServiceOfferAttachmentFormats,
  FormatServiceProposeAttachmentFormats,
  FormatServiceRequestCredentialOptions,
  HandlerAutoAcceptOptions,
} from '../models/CredentialFormatServiceOptions'

import { Lifecycle, scoped } from 'tsyringe'

import { AriesFrameworkError } from '../../../../../src/error'
import { uuid } from '../../../../../src/utils/uuid'
import { EventEmitter } from '../../../../agent/EventEmitter'
import { JsonTransformer } from '../../../../utils/JsonTransformer'
import { MessageValidator } from '../../../../utils/MessageValidator'
import { W3cCredentialService } from '../../../vc'
import { W3cVerifiableCredential, W3cCredential } from '../../../vc/models'
import { AutoAcceptCredential } from '../../CredentialAutoAcceptType'
import { CredentialFormatType } from '../../CredentialsModuleOptions'
import { composeAutoAccept } from '../../composeAutoAccept'
import { V2CredentialPreview } from '../../protocol/v2/V2CredentialPreview'
import { CredentialRepository } from '../../repository/CredentialRepository'
import { CredentialFormatService } from '../CredentialFormatService'
import { CredentialFormatSpec } from '../models/CredentialFormatServiceOptions'

@scoped(Lifecycle.ContainerScoped)
export class JsonLdCredentialFormatService extends CredentialFormatService {
  protected credentialRepository: CredentialRepository // protected as in base class
  private w3cCredentialService: W3cCredentialService

  public constructor(
    credentialRepository: CredentialRepository,
    eventEmitter: EventEmitter,
    w3cCredentialService: W3cCredentialService
  ) {
    super(credentialRepository, eventEmitter)
    this.credentialRepository = credentialRepository
    this.w3cCredentialService = w3cCredentialService
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param options The object containing all the options for the proposed credential
   * @returns object containing associated attachment, formats and filtersAttach elements
   *
   */
  public async createProposal(options: ProposeCredentialOptions): Promise<FormatServiceProposeAttachmentFormats> {
    if (!options.credentialFormats.jsonld) {
      throw new AriesFrameworkError('Missing proposal payload in create proposal json ld')
    }
    const format = new CredentialFormatSpec({
      attachId: 'ld_proof',
      format: 'aries/ld-proof-vc-detail@v1.0',
    })
    await MessageValidator.validate(options.credentialFormats.jsonld)

    const attachment: Attachment = this.getFormatData(options.credentialFormats.jsonld, format.attachId)
    return { format, attachment }
  }

  /**
   * Method called on reception of a propose credential message
   * We do the necessary processing here to accept the proposal and do the state change, emit event etc.
   * @param options the options needed to accept the proposal
   */
  public async processProposal(options: ServiceAcceptProposalOptions): Promise<void> {
    const credProposalJson = options.proposalAttachment?.getDataAsJson<SignCredentialOptions>()
    if (!credProposalJson) {
      throw new AriesFrameworkError('Missing indy credential proposal data payload')
    }
    await MessageValidator.validate(credProposalJson)

    options.credentialFormats = {
      jsonld: credProposalJson,
    }
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param options The object containing all the options for the credential offer
   * @returns object containing associated attachment, formats and offersAttach elements
   *
   */
  public async createOffer(options: ServiceOfferCredentialOptions): Promise<FormatServiceOfferAttachmentFormats> {
    const formats = new CredentialFormatSpec({
      attachId: uuid(),
      format: 'aries/ld-proof-vc-detail@v1.0',
    })

    // if the proposal has an attachment Id use that, otherwise the generated id of the formats object
    const attachmentId = options.attachId ? options.attachId : formats.attachId

    // exchange can begin with proposal or offer
    let messageAttachment
    if (!options.proposalAttachment) {
      if (!options.credentialFormats.jsonld) {
        throw new AriesFrameworkError('create JsonLd offer: missing credential attachment')
      }
      messageAttachment = options.credentialFormats.jsonld
    } else {
      // there is a proposal - use that as the message attachment
      messageAttachment = options.proposalAttachment.getDataAsJson<SignCredentialOptions>()
    }
    const offersAttach: Attachment = this.getFormatData(messageAttachment, attachmentId)

    // need to provide an empty preview as per the spec
    const preview = new V2CredentialPreview({
      attributes: [],
    })

    return { format: formats, preview, attachment: offersAttach }
  }

  /**
   * Process incoming offer message - not implemented for json ld
   * @param attachment the attachment containing the offer
   * @param credentialRecord the credential record for the message exchange
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async processOffer(attachment: Attachment, credentialRecord: CredentialExchangeRecord): Promise<void> {
    const credOfferJson = attachment?.getDataAsJson<SignCredentialOptions>()
    if (!credOfferJson) {
      throw new AriesFrameworkError('Missing indy credential offer data payload')
    }
    await MessageValidator.validate(credOfferJson)
  }

  /**
   * Create a credential attachment format for a credential request.
   *
   * @param options The object containing all the options for the credential request
   * @param credentialRecord the credential record containing the offer from which this request
   * is derived
   * @returns object containing associated attachment, formats and requestAttach elements
   *
   */
  public async createRequest(
    options: FormatServiceRequestCredentialOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<FormatServiceCredentialAttachmentFormats> {
    if (!options.offerAttachment) {
      throw new AriesFrameworkError(
        `Missing attachment from offer message, credential record id = ${credentialRecord.id}`
      )
    }
    const formats = new CredentialFormatSpec({
      attachId: uuid(),
      format: 'aries/ld-proof-vc-detail@v1.0',
    })

    // W3C message exchange can begin with request or there could be an offer.
    // Use offer attachment as the credential if present
    // otherwise use the credential format payload passed in the options object

    let credOffer = options.jsonld

    if (!credOffer) {
      credOffer = options.offerAttachment.getDataAsJson<SignCredentialOptions>()
    }
    await MessageValidator.validate(credOffer)

    const requestAttach: Attachment = this.getFormatData(credOffer, formats.attachId)

    return { format: formats, attachment: requestAttach }
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param options The object containing all the options for the credential to be issued
   * @param record the credential record containing the offer from which this request
   * is derived
   * @param requestAttachment the attachment containing the request
   * @returns object containing associated attachment, formats and requestAttach elements
   *
   */
  public async createCredential(
    options: ServiceAcceptRequestOptions,
    record: CredentialExchangeRecord,
    requestAttachment: Attachment
  ): Promise<FormatServiceCredentialAttachmentFormats> {
    if (!requestAttachment || !requestAttachment?.data?.base64) {
      throw new AriesFrameworkError(
        `Missing request attachment from request message, credential record id = ${record.id}`
      )
    }

    const formats = new CredentialFormatSpec({
      attachId: uuid(),
      format: 'aries/ld-proof-vc@1.0',
    })

    const attachmentId = options.attachId ? options.attachId : formats.attachId

    // sign credential here. credential to be signed is received as the request attachment
    // (attachment in the request message from holder to issuer)
    const credentialOptions = requestAttachment?.getDataAsJson<SignCredentialOptions>()
    const signCredentialOptions: SignCredentialOptions = {
      credential: JsonTransformer.fromJSON(credentialOptions.credential, W3cCredential),
      proofType: credentialOptions.proofType,
      verificationMethod: credentialOptions.verificationMethod,
    }
    const verifiableCredential = await this.w3cCredentialService.signCredential(signCredentialOptions)
    const issueAttachment: Attachment = this.getFormatData(verifiableCredential, attachmentId)

    return { format: formats, attachment: issueAttachment }
  }

  /**
   * Processes an incoming credential - retrieve metadata, retrieve payload and store it in the Indy wallet
   * @param options the issue credential message wrapped inside this object
   * @param credentialRecord the credential exchange record for this credential
   */
  public async processCredential(
    options: ServiceAcceptCredentialOptions,
    credentialRecord: CredentialExchangeRecord
  ): Promise<void> {
    // 1. check credential attachment is present
    // 2. Retrieve the credential attachment
    // 3. save the credential (store using w3cCredentialService)
    // 4. save the binding to credentials array in credential exchange record
    if (!options.credentialAttachment) {
      throw new AriesFrameworkError(
        `JsonLd processCredential - Missing credential attachment for record id ${credentialRecord.id}`
      )
    }
    const credentialAsJson = options.credentialAttachment.getDataAsJson<W3cVerifiableCredential>()

    const credential = JsonTransformer.fromJSON(credentialAsJson, W3cVerifiableCredential)

    const verifiableCredential: W3cCredentialRecord = await this.w3cCredentialService.storeCredential({
      record: credential,
    })

    if (!verifiableCredential.credential.id) {
      throw new AriesFrameworkError(
        `JsonLd processCredential - Missing credential id in verifiable credential for record id ${credentialRecord.id}`
      )
    }
    credentialRecord.credentials.push({
      credentialRecordType: CredentialFormatType.JsonLd,
      credentialRecordId: verifiableCredential.id,
    })
  }

  /**
   * Gets the attachment object for a given attachId. We need to get out the correct attachId for
   * JsonLd and then find the corresponding attachment (if there is one)
   * @param formats the formats object containing the attachid
   * @param messageAttachment the attachment containing the payload
   * @returns The Attachment if found or undefined
   */
  public getAttachment(formats: CredentialFormatSpec[], messageAttachment: Attachment[]): Attachment | undefined {
    const formatId = formats.find((f) => f.format.includes('aries'))
    const attachment = messageAttachment?.find((attachment) => attachment.id === formatId?.attachId)
    return attachment
  }

  public shouldAutoRespondToProposal(options: HandlerAutoAcceptOptions): boolean {
    const autoAccept = composeAutoAccept(options.credentialRecord.autoAcceptCredential, options.autoAcceptType)
    if (autoAccept === AutoAcceptCredential.Always) {
      return true
    }
    if (options.proposalAttachment && options.offerAttachment) {
      if (this.areCredentialsEqual(options.proposalAttachment.data, options.offerAttachment.data)) {
        return true
      }
    }

    return false
  }

  private areCredentialsEqual(message1: AttachmentData, message2: AttachmentData): boolean {
    return JSON.stringify(message1) === JSON.stringify(message2)
  }

  private arePreviousCredentialsEqual(
    request: AttachmentData,
    proposal?: AttachmentData,
    offer?: AttachmentData
  ): boolean {
    if (!request) {
      return false
    }
    if (proposal || offer) {
      const previousCredential = offer ? offer : proposal

      if (previousCredential) {
        if (this.areCredentialsEqual(previousCredential, request)) {
          return true
        }
        return true
      }
    }
    return false
  }

  public shouldAutoRespondToRequest(options: HandlerAutoAcceptOptions): boolean {
    const autoAccept = composeAutoAccept(options.credentialRecord.autoAcceptCredential, options.autoAcceptType)

    if (!options.requestAttachment) {
      throw new AriesFrameworkError(`Missing Request Attachment for Credential Record ${options.credentialRecord.id}`)
    }
    if (autoAccept === AutoAcceptCredential.ContentApproved) {
      return this.arePreviousCredentialsEqual(
        options.requestAttachment.data,
        options.offerAttachment?.data,
        options.proposalAttachment?.data
      )
    }
    return false
  }
  private areCredentialValuesValid(_credentialRecord: CredentialExchangeRecord, _credentialAttachment: Attachment) {
    return true // temporary until we have the credential attributes to compare with credential attachment
  }

  public shouldAutoRespondToCredential(options: HandlerAutoAcceptOptions): boolean {
    const autoAccept = composeAutoAccept(options.credentialRecord.autoAcceptCredential, options.autoAcceptType)

    if (autoAccept === AutoAcceptCredential.ContentApproved) {
      if (options.credentialAttachment) {
        return this.areCredentialValuesValid(options.credentialRecord, options.credentialAttachment)
      }
    }
    return false
  }

  public processRequest(_options: RequestCredentialOptions, _credentialRecord: CredentialExchangeRecord): void {
    throw new Error('Method not implemented.')
  }

  public async deleteCredentialById(credentialRecordId: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}