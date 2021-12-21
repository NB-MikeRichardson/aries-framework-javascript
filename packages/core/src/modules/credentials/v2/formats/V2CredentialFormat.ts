
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

const INDY_ATTACH_ID = "indy"
const INDY_PROPOSE_FORMAT = "hlindy/cred-filter@v2.0"
const INDY_OFFER_FORMAT = "hlindy/cred-abstract@v2.0"

const LD_ATTACH_ID = "..." // MJR-TODO
const LD_PROPOSE_FORMAT = "..." // MJR-TODO
const LD_OFFER_FORMAT = "aries/ld-proof-vc-detail@v1.0" 


const V2IndyProposeCredentialFormat: V2CredentialFormatSpec = {
    attachId: INDY_ATTACH_ID,
    format: INDY_PROPOSE_FORMAT
}

const V2JsonLdProposeCredentialFormat: V2CredentialFormatSpec = {
    attachId: LD_ATTACH_ID,
    format: LD_PROPOSE_FORMAT
}

const V2IndyOfferCredentialFormat: V2CredentialFormatSpec = {
    attachId: INDY_ATTACH_ID,
    format: INDY_OFFER_FORMAT
}

const V2JsonLdOfferCredentialFormat: V2CredentialFormatSpec = {
    attachId: LD_ATTACH_ID,
    format: LD_OFFER_FORMAT
}

export const ATTACHMENT_FORMAT: V2CredentialAttachmentFormat = {
    CRED_20_PROPOSAL: {
        indy: V2IndyProposeCredentialFormat,
        ldproof: V2JsonLdProposeCredentialFormat
    },
    CRED_20_OFFER: {
        indy: V2IndyOfferCredentialFormat,
        ldproof: V2JsonLdOfferCredentialFormat
    },

    // MJR-TODO
    // CRED_20_REQUEST: {
    //     V20CredFormat.Format.INDY.api: "hlindy/cred-req@v2.0",
    //     V20CredFormat.Format.LD_PROOF.api: "aries/ld-proof-vc-detail@v1.0",
    // },
    // CRED_20_ISSUE: {
    //     V20CredFormat.Format.INDY.api: "hlindy/cred@v2.0",
    //     V20CredFormat.Format.LD_PROOF.api: "aries/ld-proof-vc@v1.0",
    // },
}


// const test:V2CredentialFormatSpec = ATTACHMENT_FORMAT["CRED_20_PROPOSAL"].indy

