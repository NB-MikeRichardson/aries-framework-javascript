import type { Agent } from '../../../../../agent/Agent'

import {
  setupCombinedSeparateIndyAndJsonLdProofsTest,
  waitForProofExchangeRecord,
} from '../../../../../../tests/helpers'
import { DidCommMessageRepository } from '../../../../../storage'
import {
  AttributeFilter,
  AutoAcceptProof,
  PredicateType,
  ProofAttributeInfo,
  ProofPredicateInfo,
  ProofState,
  V2PresentationMessage,
} from '../../../../proofs'

describe('Auto accept present proof', () => {
  let faberAgent: Agent
  let aliceAgent: Agent

  // Input_descriptors define the fields to be requested in a presentation definition for a given credential
  // submission_requirements specify combinations of input descriptors to allow multiple credentials
  // to be retrieved

  // query is based on matching the schema uri in the credential with that of the input descriptor g

  const inputDescriptorCitizenship = {
    constraints: {
      fields: [
        {
          path: ['$.credentialSubject.familyName'],
          purpose: 'The claim must be from one of the specified issuers',
          id: '1f44d55f-f161-4938-a659-f8026467f126',
        },
        {
          path: ['$.credentialSubject.givenName'],
          purpose: 'The claim must be from one of the specified issuers',
        },
      ],
    },
    schema: [
      {
        uri: 'https://www.w3.org/2018/credentials/v1',
      },
      {
        uri: 'https://www.w3.org/2018/credentials#VerifiableCredential',
      },
      {
        uri: 'https://w3id.org/citizenship#PermanentResident',
      },
      {
        uri: 'https://w3id.org/citizenship/v1',
      },
      {
        uri: 'https://w3id.org/security/bbs/v1',
      },
    ],
    name: "EU Driver's License 1",
    group: ['A'],
    id: 'citizenship_input_1',
  }

  describe('Auto accept on `always`', () => {
    afterAll(async () => {
      if (faberAgent) {
        await faberAgent.shutdown()
        await faberAgent.wallet.delete()
      }
      if (aliceAgent) {
        await aliceAgent.shutdown()
        await aliceAgent.wallet.delete()
      }
    })

    test('COMBINED FORMATS (INDY/JSON-LD): Faber starts with proof requests to Alice', async () => {
      const { faberAgent, aliceAgent, credDefId, faberConnection } = await setupCombinedSeparateIndyAndJsonLdProofsTest(
        'Faber Auto Accept Always Proofs',
        'Alice Auto Accept Always Proofs',
        AutoAcceptProof.Always
      )

      const attributes = {
        name: new ProofAttributeInfo({
          name: 'name',
          restrictions: [
            new AttributeFilter({
              credentialDefinitionId: credDefId,
            }),
          ],
        }),
      }
      const predicates = {
        age: new ProofPredicateInfo({
          name: 'age',
          predicateType: PredicateType.GreaterThanOrEqualTo,
          predicateValue: 50,
          restrictions: [
            new AttributeFilter({
              credentialDefinitionId: credDefId,
            }),
          ],
        }),
      }

      console.log("ANONCREDS proof request = ",  {
        name: 'proof-request',
        version: '1.0',
        nonce: '1298236324866',
        requestedAttributes: attributes,
        requestedPredicates: predicates,
      })

      console.log("LDPROOF (PEX) proof request = ", {
        options: {
          challenge: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
          domain: '',
        },
        presentationDefinition: {
          id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
          input_descriptors: [inputDescriptorCitizenship],
        },
      })
      console.log("LDPROOF (PEX) proof request input descriptors = ", inputDescriptorCitizenship)

      const faberProofExchangeRecord = await faberAgent.proofs.requestProof({
        protocolVersion: 'v2',
        connectionId: faberConnection.id,
        proofFormats: {
          indy: {
            name: 'proof-request',
            version: '1.0',
            nonce: '1298236324866',
            requestedAttributes: attributes,
            requestedPredicates: predicates,
          },
          presentationExchange: {
            options: {
              challenge: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              domain: '',
            },
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: [inputDescriptorCitizenship],
            },
          },
        },
      })
      await waitForProofExchangeRecord(faberAgent, {
        threadId: faberProofExchangeRecord.threadId,
        state: ProofState.Done,
      })
      // Alice waits till it receives presentation ack
      await waitForProofExchangeRecord(aliceAgent, {
        threadId: faberProofExchangeRecord.threadId,
        state: ProofState.Done,
      })

      const didCommMessageRepository =
        faberAgent.injectionContainer.resolve<DidCommMessageRepository>(DidCommMessageRepository)

      const presentation = await didCommMessageRepository.findAgentMessage(faberAgent.context, {
        associatedRecordId: faberProofExchangeRecord.id,
        messageClass: V2PresentationMessage,
      })

      console.log("COMBINED presentation = ", presentation)

      console.log("INDY presentation = ", presentation?.presentationsAttach[0].getDataAsJson())

      console.log("PEX JSON-LD presentation = ", presentation?.presentationsAttach[1].getDataAsJson())

      // 2 formats: indy and pex
      expect(presentation?.formats.length).toBe(2)
      expect(presentation?.presentationsAttach.length).toBe(2)
    })
  })
})
