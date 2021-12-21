import { V2CredentialFormatSpec } from "../formats/V2CredentialFormat"
import type { Attachment } from '../../../../decorators/attachment/Attachment'
import { Equals } from 'class-validator'
import { AgentMessage } from '../../../../agent/AgentMessage'
import { CredentialPreview } from '../../CredentialPreview'

export class V2ProposalCredentialMessage extends AgentMessage {

  private comment?: string
  private credentialPreview?: CredentialPreview
  private formats: V2CredentialFormatSpec
  private filtersAttach: Attachment

  constructor(id: string, 
    formats: V2CredentialFormatSpec,
    filtersAttach: Attachment,
    comment?: string,
    credentialPreview?: CredentialPreview,) {
    super()
    this.id = id
    this.comment = comment
    this.credentialPreview = credentialPreview
    this.formats = formats
    this.filtersAttach = filtersAttach
  }

  @Equals(V2ProposalCredentialMessage.type)
  public readonly type = V2ProposalCredentialMessage.type
  public static readonly type = 'https://didcomm.org/issue-credential/2.0/propose-credential'
}