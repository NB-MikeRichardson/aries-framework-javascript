import type { Agent, ConnectionRecord } from '../src'
import type { ProposeProofOptions, RequestProofOptions } from '../src/modules/proofs/ProofsApiOptions'
import type { SubmissionRequirement } from '@sphereon/pex-models'

import { AutoAcceptProof, ProofState } from '../src'
import { ProofProtocolVersion } from '../src/modules/proofs/models/ProofProtocolVersion'

import { setupProofsTest, waitForProofRecord } from './helpers'
import testLogger from './logger'

describe('Auto accept present proof', () => {
  let faberAgent: Agent
  let aliceAgent: Agent
  let faberConnection: ConnectionRecord
  let aliceConnection: ConnectionRecord

  // MJR:
  //  input_descriptors define the fields to be requested in a presentation definition for a given credential
  // submission_requirements specify combinations of input descriptors to allow multiple credentials
  // to be retrieved

  // query is based on matching the schema uri in the credential with that of the input descriptor g

  const inputDescriptor = {
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
      // limit_disclosure: 'required',
      // is_holder: [
      //   {
      //     directive: 'required',
      //     field_id: ['1f44d55f-f161-4938-a659-f8026467f126'],
      //   },
      // ],
    },
    schema: [
      {
        uri: 'https://www.w3.org/2018/credentials#VerifiableCredential',
      },
      {
        uri: 'https://w3id.org/citizenship#PermanentResident',
      },
      {
        uri: 'https://w3id.org/citizenship/v1',
      },
    ],
    name: "EU Driver's License 1",
    group: ['A'],
    id: 'citizenship_input_1',
  }

  const inputDescriptor2 = {
    constraints: {
      fields: [
        {
          path: ['$.credentialSubject.familyName'],
          purpose: 'The claim must be from one of the specified issuers',
          id: '1f44d35f-f161-4938-a659-f8026469f126',
        },
        {
          path: ['$.credentialSubject.givenName'],
          purpose: 'The claim must be from one of the specified issuers',
        },
      ],
      // limit_disclosure: 'required',
      // is_holder: [
      //   {
      //     directive: 'required',
      //     field_id: ['1f44d55f-f161-4938-a659-f8026467f126'],
      //   },
      // ],
    },
    schema: [
      {
        uri: 'https://www.w3.org/2018/credentials#VerifiableCredential',
      },
      {
        uri: 'https://w3id.org/citizenship#PermanentResident',
      },
      {
        uri: 'https://w3id.org/citizenship/v1',
      },
    ],
    name: 'Banking Information',
    group: ['B'],
    id: 'citizenship_input_2',
  }
  const inputDescriptor3 = {
    constraints: {
      fields: [
        {
          path: ['$.credentialSubject.familyName'],
          purpose: 'The claim must be from one of the specified issuers',
          id: '1f44d35f-f161-4918-1111-f8026467f126',
        },
        {
          path: ['$.credentialSubject.givenName'],
          purpose: 'The claim must be from one of the specified issuers',
        },
      ],
      // limit_disclosure: 'required',
      // is_holder: [
      //   {
      //     directive: 'required',
      //     field_id: ['1f44d55f-f161-4938-a659-f8026467f126'],
      //   },
      // ],
    },
    schema: [
      {
        uri: 'https://www.w3.org/2018/credentials#VerifiableCredential',
      },
      {
        uri: 'https://w3id.org/citizenship#PermanentResident',
      },
      {
        uri: 'https://w3id.org/citizenship/v1',
      },
    ],
    name: 'EU Tax Record',
    group: ['C'],
    id: 'citizenship_input_3',
  }
  const inputDescriptor4 = {
    constraints: {
      fields: [
        {
          path: ['$.credentialSubject.familyName'],
          purpose: 'The claim must be from one of the specified issuers',
          id: '1f44d35f-3333-4918-a659-f8026867f126',
        },
        {
          path: ['$.credentialSubject.givenName'],
          purpose: 'The claim must be from one of the specified issuers',
        },
      ],
      // limit_disclosure: 'required',
      // is_holder: [
      //   {
      //     directive: 'required',
      //     field_id: ['1f44d55f-f161-4938-a659-f8026467f126'],
      //   },
      // ],
    },
    schema: [
      {
        uri: 'https://www.w3.org/2018/credentials#VerifiableCredential',
      },
      {
        uri: 'https://w3id.org/citizenship#PermanentResident',
      },
      {
        uri: 'https://w3id.org/citizenship/v1',
      },
    ],
    name: 'EU Passport',
    group: ['A'],
    id: 'citizenship_input_4',
  }
  describe('Auto accept on `always`', () => {
    beforeAll(async () => {
      ;({ faberAgent, aliceAgent, faberConnection, aliceConnection } = await setupProofsTest(
        'Faber Auto Accept Always Proofs',
        'Alice Auto Accept Always Proofs',
        AutoAcceptProof.Always
      ))
    })
    afterAll(async () => {
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
      await aliceAgent.shutdown()
      await aliceAgent.wallet.delete()
    })

    xtest('Alice starts with proof proposal to Faber, both with autoAcceptProof on `always`', async () => {
      testLogger.test('Alice sends presentation proposal to Faber')

      const proposeProofOptions: ProposeProofOptions = {
        connectionId: aliceConnection.id,
        protocolVersion: ProofProtocolVersion.V2,
        proofFormats: {
          presentationExchange: {
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: [inputDescriptor],
            },
          },
        },
        comment: 'V2 Presentation Exchange propose proof test',
      }

      const aliceProofRecordPromise = waitForProofRecord(aliceAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      const faberProofRecordPromise = waitForProofRecord(faberAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      await aliceAgent.proofs.proposeProof(proposeProofOptions)

      testLogger.test('Faber waits for presentation from Alice')
      await faberProofRecordPromise

      testLogger.test('Alice waits till it receives presentation ack')
      await aliceProofRecordPromise
    })

    xtest('Faber starts with proof requests to Alice, both with autoAcceptProof on `always`', async () => {
      testLogger.test('Faber sends presentation request to Alice')

      const requestProofsOptions: RequestProofOptions = {
        protocolVersion: ProofProtocolVersion.V2,
        connectionId: faberConnection.id,
        proofFormats: {
          presentationExchange: {
            options: {
              challenge: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              domain: '',
            },
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: [inputDescriptor],
            },
          },
        },
      }

      const faberProofRecord = await faberAgent.proofs.requestProof(requestProofsOptions)
      testLogger.test('Faber waits for presentation from Alice')
      await waitForProofRecord(faberAgent, {
        threadId: faberProofRecord.threadId,
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })
      // Alice waits till it receives presentation ack
      await waitForProofRecord(aliceAgent, {
        threadId: faberProofRecord.threadId,
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })
    })

    test('Submission Requirements', async () => {
      testLogger.test('Alice sends presentation proposal to Faber')

      const submissionRequirements: SubmissionRequirement[] = [
        {
          name: 'Driving License Information',
          purpose: 'We need you to prove you currently hold a valid drivers license.',
          rule: 'all',
          from: 'A',
        },
        {
          name: 'Employment Information',
          purpose:
            'We are only verifying one current employment relationship, not any other information about employment.',
          rule: 'all',
          from: 'B',
        },
        // {
        //   name: 'Citizenship Information',
        //   rule: 'pick',
        //   count: 1,
        //   from_nested: [
        //     {
        //       name: 'United States Citizenship Proofs',
        //       purpose: 'We need you to prove your US citizenship.',
        //       rule: 'all',
        //       from: 'C',
        //     },
        //     {
        //       name: 'European Union Citizenship Proofs',
        //       purpose: 'We need you to prove you are a citizen of an EU member state.',
        //       rule: 'pick',
        //       count: 1,
        //       from: 'D',
        //     },
        //   ],
        // },
      ]
      const proposeProofOptions: ProposeProofOptions = {
        connectionId: aliceConnection.id,
        protocolVersion: ProofProtocolVersion.V2,
        proofFormats: {
          presentationExchange: {
            // this is of type PresentationDefinitionV1 (see pex library)
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: [inputDescriptor, inputDescriptor2, inputDescriptor3, inputDescriptor4],
              submission_requirements: submissionRequirements,
            },
          },
        },
        comment: 'V2 Presentation Exchange propose proof test',
      }

      const aliceProofRecordPromise = waitForProofRecord(aliceAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      const faberProofRecordPromise = waitForProofRecord(faberAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      await aliceAgent.proofs.proposeProof(proposeProofOptions)

      testLogger.test('Faber waits for presentation from Alice')
      await faberProofRecordPromise

      testLogger.test('Alice waits till it receives presentation ack')
      await aliceProofRecordPromise
    })
  })

  xdescribe('Auto accept on `contentApproved`', () => {
    beforeAll(async () => {
      testLogger.test('Initializing the agents')
      ;({ faberAgent, aliceAgent, faberConnection, aliceConnection } = await setupProofsTest(
        'Faber Auto Accept Content Approved Proofs',
        'Alice Auto Accept Content Approved Proofs',
        AutoAcceptProof.ContentApproved
      ))
    })
    afterAll(async () => {
      testLogger.test('Shutting down both agents')
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
      await aliceAgent.shutdown()
      await aliceAgent.wallet.delete()
    })

    test('Alice starts with proof proposal to Faber, both with autoacceptproof on `contentApproved`', async () => {
      testLogger.test('Alice sends presentation proposal to Faber')

      const proposeProofOptions: ProposeProofOptions = {
        connectionId: aliceConnection.id,
        protocolVersion: ProofProtocolVersion.V2,
        proofFormats: {
          presentationExchange: {
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: [inputDescriptor],
            },
          },
        },
        comment: 'V2 Presentation Exchange propose proof test',
      }

      const faberProofRecordPromise = waitForProofRecord(faberAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      const aliceProofRecordPromise = waitForProofRecord(aliceAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      await aliceAgent.proofs.proposeProof(proposeProofOptions)

      await faberProofRecordPromise
      // Alice waits till it receives presentation ack
      await aliceProofRecordPromise
    })

    test('Faber starts with proof requests to Alice, both with autoacceptproof on `contentApproved`', async () => {
      testLogger.test('Faber sends presentation request to Alice')

      const requestProofsOptions: RequestProofOptions = {
        protocolVersion: ProofProtocolVersion.V2,
        connectionId: faberConnection.id,
        proofFormats: {
          presentationExchange: {
            options: {
              challenge: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              domain: '',
            },
            presentationDefinition: {
              id: 'e950bfe5-d7ec-4303-ad61-6983fb976ac9',
              input_descriptors: [inputDescriptor],
            },
          },
        },
      }

      const faberProofRecordPromise = waitForProofRecord(faberAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      const aliceProofRecordPromise = waitForProofRecord(aliceAgent, {
        state: ProofState.Done,
        timeoutMs: 200000, // Temporary I have increased timeout as, verify presentation takes time to fetch the data from documentLoader
      })

      await faberAgent.proofs.requestProof(requestProofsOptions)

      testLogger.test('Faber waits for presentation from Alice')
      await faberProofRecordPromise

      // Alice waits till it receives presentation ack
      await aliceProofRecordPromise
    })
  })
})