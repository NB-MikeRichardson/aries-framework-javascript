import { uuid } from '../../../../../src/utils/uuid'

export type V2CredentialFormatSpec = {
  attachId: string
  format: string
}

type V2CredentialAttachmentFormat = {
  [id: string]: {
    indy: V2CredentialFormatSpec
    ldproof: V2CredentialFormatSpec
  }
}
function generateId(): string {
  return uuid()
}
const INDY_PROPOSE_FORMAT = 'hlindy/cred-filter@v2.0'
const INDY_OFFER_FORMAT = 'hlindy/cred-abstract@v2.0'
const INDY_REQUEST_FORMAT = 'hlindy/cred-req@v2.0'
const INDY_ISSUE_FORMAT = 'hlindy/cred@v2.0'

const LD_ATTACH_ID = '...' // MJR-TODO
const LD_PROPOSE_FORMAT = 'aries/ld-proof-vc-detail@v1.0'
const LD_OFFER_FORMAT = 'aries/ld-proof-vc-detail@v1.0'
const LD_ISSUE_FORMAT = 'aries/ld-proof-vc-detail@v1.0' // TODO-MJR

const V2IndyProposeCredentialFormat: V2CredentialFormatSpec = {
  attachId: generateId(),
  format: INDY_PROPOSE_FORMAT,
}

const V2JsonLdProposeCredentialFormat: V2CredentialFormatSpec = {
  attachId: LD_ATTACH_ID,
  format: LD_PROPOSE_FORMAT,
}

const V2IndyOfferCredentialFormat: V2CredentialFormatSpec = {
  attachId: generateId(),
  format: INDY_OFFER_FORMAT,
}

const V2IndyIssueCredentialFormat: V2CredentialFormatSpec = {
  attachId: generateId(),
  format: INDY_ISSUE_FORMAT,
}

const V2JsonLdOfferCredentialFormat: V2CredentialFormatSpec = {
  attachId: LD_ATTACH_ID,
  format: LD_OFFER_FORMAT,
}

const V2IndyRequestCredentialFormat: V2CredentialFormatSpec = {
  attachId: generateId(),
  format: INDY_REQUEST_FORMAT,
}

const V2JsonLdRequestCredentialFormat: V2CredentialFormatSpec = {
  attachId: LD_ATTACH_ID,
  format: LD_OFFER_FORMAT,
}
const V2JsonLdIssueCredentialFormat: V2CredentialFormatSpec = {
  attachId: LD_ATTACH_ID,
  format: LD_ISSUE_FORMAT,
}
export const ATTACHMENT_FORMAT: V2CredentialAttachmentFormat = {
  CRED_20_PROPOSAL: {
    indy: V2IndyProposeCredentialFormat,
    ldproof: V2JsonLdProposeCredentialFormat,
  },
  CRED_20_OFFER: {
    indy: V2IndyOfferCredentialFormat,
    ldproof: V2JsonLdOfferCredentialFormat,
  },
  CRED_20_REQUEST: {
    indy: V2IndyRequestCredentialFormat,
    ldproof: V2JsonLdRequestCredentialFormat,
  },
  CRED_20_ISSUE: {
    indy: V2IndyIssueCredentialFormat,
    ldproof: V2JsonLdIssueCredentialFormat,
  },
}