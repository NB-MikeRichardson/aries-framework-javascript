
import type { CredentialProposeOptions } from './v1'
import type { CredentialRecord } from './repository/CredentialRecord'
import type { ConnectionRecord } from '../connections'

import {
  OfferCredentialOptions,
  ProposeCredentialOptions,
  AcceptProposalOptions,
  NegotiateProposalOptions,
  AcceptOfferOptions,
  NegotiateOfferOptions,
  RequestCredentialOptions,
  AcceptRequestOptions,
} from './v2/interfaces'

import { CredentialExchangeRecord } from './v2/CredentialExchangeRecord'

export interface CredentialsAPI {
  

  proposeCredential(credentialOptions: ProposeCredentialOptions): Promise<CredentialExchangeRecord>


  // acceptProposal(credentialOptions: AcceptProposalOptions): Promise<CredentialExchangeRecord>
  // negotiateProposal(credentialOptions: NegotiateProposalOptions): Promise<CredentialExchangeRecord>

  // // Offer
  // offerCredential(credentialOptions: OfferCredentialOptions): Promise<CredentialExchangeRecord>
  // acceptOffer(credentialOptions: AcceptOfferOptions): Promise<CredentialExchangeRecord>
  // declineOffer(credentialRecordId: string): Promise<CredentialExchangeRecord>
  // negotiateOffer(credentialOptions: NegotiateOfferOptions): Promise<CredentialExchangeRecord>

  // // Request
  // requestCredential(credentialOptions: RequestCredentialOptions): Promise<CredentialExchangeRecord>
  // acceptRequest(credentialOptions: AcceptRequestOptions): Promise<CredentialExchangeRecord>

  // // Credential
  // acceptCredential(credentialRecordId: string): Promise<CredentialExchangeRecord>

  // // Record Methods
  // getAll(): Promise<CredentialExchangeRecord[]>
  // getById(credentialRecordId: string): Promise<CredentialExchangeRecord>
  // findById(credentialRecordId: string): Promise<CredentialExchangeRecord | null>
  // deleteById(credentialRecordId: string): Promise<void>
  // findByQuery(query: Record<string, Tag | string[]>): Promise<CredentialExchangeRecord[]>

  getByIdV2(credentialRecordId: string): Promise<CredentialRecord> // old definition -> tmp


}

type Tag = string | boolean | number


