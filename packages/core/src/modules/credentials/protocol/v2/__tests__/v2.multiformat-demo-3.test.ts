import type { Agent } from '../../../../../agent/Agent'
import type { IVerifiablePresentation } from '@sphereon/ssi-types'

import { setupJsonLdProofsTestMultipleCredentials, waitForProofExchangeRecord } from '../../../../../../tests/helpers'
import { DidCommMessageRepository } from '../../../../../storage'
import { AutoAcceptProof, ProofState, V2PresentationMessage } from '../../../../proofs'

const inputDescriptors = [
  {
    id: 'vaccine_input_1',
    name: 'Vaccine Information v1',
    purpose: 'We need your Vaccine information.',
    group: ['A'],
    schema: [
      {
        uri: 'https://w3id.org/vaccination/v1',
      },
    ],
  },
  {
    id: 'citizenship_input_1',
    name: 'Residency Information',
    purpose: 'We need your Residency information.',
    group: ['B'],
    schema: [
      {
        uri: 'https://w3id.org/citizenship/v1',
      },
    ],
  },
  {
    id: 'citizenship_input_2',
    name: 'Permanent Residency Card',
    purpose: 'We need your Residency information.',
    group: ['B'],
    schema: [
      {
        uri: 'https://w3id.org/citizenship/v2',
      },
    ],
  },
  {
    id: 'vaccine_input_2',
    name: 'Vaccine Information',
    purpose: 'We need your Vaccine information.',
    group: ['C'],
    schema: [
      {
        uri: 'https://w3id.org/vaccination/v2',
      },
    ],
  },
]
describe('Auto accept present proof', () => {
  let faberAgent: Agent
  let aliceAgent: Agent

  // Input_descriptors define the fields to be requested in a presentation definition for a given credential
  // submission_requirements specify combinations of input descriptors to allow multiple credentials
  // to be retrieved

  // query is based on matching the schema uri in the credential with that of the input descriptor g

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

    test('Submission Requirements with nested rules (use pick/count so nested is an OR query)', async () => {
      const { faberAgent, aliceAgent, aliceConnection } = await setupJsonLdProofsTestMultipleCredentials(
        'Faber Auto Accept Always Proofs',
        'Alice Auto Accept Always Proofs',
        AutoAcceptProof.Always
      )
      const didCommMessageRepository =
        faberAgent.injectionContainer.resolve<DidCommMessageRepository>(DidCommMessageRepository)

      const aliceProofExchangeRecordPromise = waitForProofExchangeRecord(aliceAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // CI tests are timing out without this. Q: how can we solve this?
      })

      const faberProofExchangeRecordPromise = waitForProofExchangeRecord(faberAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // CI tests are timing out without this. Q: how can we solve this?
      })

      await aliceAgent.proofs.proposeProof({
        connectionId: aliceConnection.id,
        protocolVersion: 'v2',
        proofFormats: {
          presentationExchange: {
            // this is of type PresentationDefinitionV1 (see pex library)
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: inputDescriptors,
              submission_requirements: [
                {
                  name: 'Vaccine Information',
                  purpose: 'We need to know if you are vaccinated',
                  rule: 'all',
                  from: 'A',
                },
                {
                  name: 'Citizenship Combined With Vaccine Information',
                  purpose: 'We need to know if you are either a resident or vaccinated',
                  rule: 'pick', // OR query: retrieve 1 from B OR 1 from C
                  count: 1,
                  from_nested: [
                    {
                      name: 'Citizenship Information',
                      purpose: 'We need to know if you are a resident',
                      rule: 'pick',
                      count: 1,
                      from: 'B',
                    },
                    {
                      name: 'More Vaccine Information',
                      purpose: 'We need to know if you are vaccinated',
                      rule: 'pick',
                      count: 1,
                      from: 'C',
                    },
                  ],
                },
              ],
            },
          },
        },
        comment: 'V2 Presentation Exchange propose proof test',
      })

      const faberProofExchangeRecord = await faberProofExchangeRecordPromise

      await aliceProofExchangeRecordPromise

      const presentation = await didCommMessageRepository.findAgentMessage(faberAgent.context, {
        associatedRecordId: faberProofExchangeRecord.id,
        messageClass: V2PresentationMessage,
      })

      const data: IVerifiablePresentation | undefined =
        presentation?.presentationsAttach[0].getDataAsJson<IVerifiablePresentation>()

      console.log("MULTI QUERY PRESENTATION = ", data)

      // expect 2 VCs: one from group A, one from either group B or group C (in this case B)
      expect(data?.verifiableCredential.length).toBe(2)

      // vaccine credential 0 (Group A)
      expect(data?.verifiableCredential[0].id).toBe('urn:uvci:af5vshde843jf831j128fj')

      // citizenship credential 1 (Group B)
      expect(data?.verifiableCredential[1].id).toBe('https://issuer.oidp.uscis.gov/credentials/83627465dsdsdsd')
    })
  })
})
