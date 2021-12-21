import { AttachmentFormats, CredentialFormatService } from '../CredentialFormatService'
import { ATTACHMENT_FORMAT, V2CredentialFormatSpec } from '../V2CredentialFormat'
import { ProposeCredentialOptions } from '../../interfaces'
import { Attachment, AttachmentData } from '../../../../../decorators/attachment/Attachment'
import { JsonEncoder } from '../../../../../utils/JsonEncoder'
import { CredentialPreview } from '../../../CredentialPreview'
import { V2CredentialRecord } from '../../V2CredentialRecord'


export class IndyCredentialFormatService extends CredentialFormatService {

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param proposal The object containing all the options for the proposed credential
   * @param messageType the type of message which can be Indy, JsonLd etc eg "CRED_20_PROPOSAL"
   * @returns object containing associated attachment and formats elements
   *
   */
  public getCredentialProposeAttachFormats(proposal: ProposeCredentialOptions, messageType: string): AttachmentFormats {
    let preview: CredentialPreview | undefined

    if (proposal?.credentialFormats.indy?.attributes) {
      preview = new CredentialPreview({ attributes: proposal?.credentialFormats.indy?.attributes })
    }

    const formats: V2CredentialFormatSpec = this.getFormatIdentifier(messageType)
    const filtersAttach: Attachment = this.getFormatData(messageType, proposal)

    return { preview, formats, filtersAttach }
  }

  /**
   * Save the meta data and emit event
   */
  public async save(proposal: ProposeCredentialOptions, credentialRecord: V2CredentialRecord): Promise<void> {

    console.log(">>>>>>>>>>>> save metadata and emit event")
    // save and emit event (this needs format specific params so put it here)
    credentialRecord.metadata.set('_internal/indyCredential', {
      schemaId: proposal.credentialFormats.indy?.schemaId,
      credentialDefinintionId: proposal.credentialFormats.indy?.credentialDefinitionId,
    })

    return await super.emitEvent(credentialRecord)
  }
  /**
   * Get attachment format identifier for format and message combination
   * 
   * @param messageType Message type for which to return the format identifier
   * @return V2CredentialFormatSpec - Issue credential attachment format identifier
   */
  getFormatIdentifier(messageType: string): V2CredentialFormatSpec {
    return ATTACHMENT_FORMAT[messageType].indy
  }

  /**
   * 
   * Returns an object of type {@link Attachment} for use in credential exchange messages. 
   * It looks up the correct format identifier and encodes the data as a base64 attachment.
   * 
   * @param message_type The message type for which to return the cred format.
   *       Should be one of the message types defined in the message types file
   * @param data The data to include in the attach object
   * @returns attachment to the credential proposal
   */
  getFormatData(messageType: string, data: ProposeCredentialOptions): Attachment {
    return new Attachment({
      id: 'indy',
      mimeType: 'application/json',
      data: new AttachmentData({
        base64: JsonEncoder.toBase64(data),
      }),
    })
  }

}

