import { CredentialRecord, CredentialRecordProps } from '../repository'
import { Type } from 'class-transformer'


import {
  V2ProposalCredentialMessage
} from './messages/V2ProposeCredentialMessage'
import { ThreadDecorated } from 'packages/core/src/decorators/thread/ThreadDecoratorExtension'

export class V2CredentialRecord extends CredentialRecord {

  public constructor(props: CredentialRecordProps) {
    super(props)
  }
  
  @Type(() => V2ProposalCredentialMessage)
  public credentialProposeMessage?: V2ProposalCredentialMessage 
}