import { ProposeCredentialOptions } from "./interfaces";
import { V2ProposalCredentialMessage } from './messages/V2ProposeCredentialMessage'
import { CredentialRecordProps } from '../repository/CredentialRecord'
import { AgentMessage } from 'packages/core/src/agent/AgentMessage';
import { CredentialFormatService } from './formats/CredentialFormatService';
import { CredentialPreviewAttribute } from '../CredentialPreview';
import { CredentialState } from '..';
import { LinkedAttachment } from 'packages/core/src/utils/LinkedAttachment';
import { V2CredentialRecord } from './V2CredentialRecord'



export interface CredentialProtocolMsgReturnType<MessageType extends AgentMessage> {
  message: MessageType
  credentialRecord: V2CredentialRecord
}

export class CredentialMessageBuilder {

  public createProposal(
    formatService: CredentialFormatService,
    proposal: ProposeCredentialOptions,
    threadId?: string
  ): CredentialProtocolMsgReturnType<V2ProposalCredentialMessage> {

    // create message
    const { preview, formats, filtersAttach } = formatService.getCredentialProposeAttachFormats(proposal, 'CRED_20_PROPOSAL')

    let credentialAttributes: CredentialPreviewAttribute[] | undefined
    let linkedAttachments: LinkedAttachment[] | undefined
   
    const message: V2ProposalCredentialMessage = new V2ProposalCredentialMessage(formatService.generateId(), formats, filtersAttach, proposal.comment, preview)

    const props : CredentialRecordProps = {
      connectionId: proposal.connectionId,
      threadId: threadId ? threadId : "",
      state: CredentialState.ProposalSent,
      linkedAttachments: linkedAttachments?.map((lkattachment) => lkattachment.attachment),
      credentialAttributes: credentialAttributes,
      autoAcceptCredential: proposal?.autoAcceptCredential,
    }
    
    // Create record

    const credentialRecord = new V2CredentialRecord(props)
    credentialRecord.credentialProposeMessage = message // new V2 field

    return {message, credentialRecord}
  }
}

