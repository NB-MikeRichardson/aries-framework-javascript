
import { AgentMessage } from '@aries-framework/core'
import { CredentialsAPI } from './CredentialAPI'
import { CredentialRecordType, CredentialExchangeRecord, CredentialRecordBinding } from './v2/CredentialExchangeRecord'
import { CredentialState } from './CredentialState';
import { CredentialProtocolVersion } from './CredentialProtocolVersion'
import { ProposeCredentialOptions } from './v2/interfaces'
import { CredentialPreview } from './v1/messages/CredentialPreview'
import { AgentConfig } from '../../agent/AgentConfig'
import { Dispatcher } from '../../agent/Dispatcher'
import { CredentialProposeOptions } from './v1'
import { V1CredentialService } from './v1/V1CredentialService'
import { ConnectionRecord } from '../../modules/connections';
import { ConnectionService } from '../../modules/connections/services/ConnectionService'
import { CredentialRecord, CredentialRecordProps } from './repository'
import { LinkedAttachment } from '../../utils/LinkedAttachment'
import { CredentialRepository } from './repository'
import { MessageSender } from '../../agent/MessageSender'
import { Lifecycle, scoped } from 'tsyringe'
import { createOutboundMessage } from '../../agent/helpers'
import { ProposeCredentialMessage } from './v1/messages'
import { EventEmitter } from '../../agent/EventEmitter'
import { CredentialEventTypes } from './CredentialEvents'
import { CredentialsModule } from './CredentialsModule'
import { ProposeCredentialFormats, IndyProposeCredentialFormat } from './v2/interfaces'
import { MediationRecipientService } from '../routing'
import { CredentialResponseCoordinator } from './CredentialResponseCoordinator'


// import type { AutoAcceptCredential } from './CredentialAutoAcceptType'
// import type { Attachment } from '../../decorators/attachment/Attachment'
import type { CredentialStateChangedEvent } from './CredentialEvents'
import { CredentialRole } from './v2/CredentialRole';


import { ConsoleLogger, LogLevel } from '../../logger'

const logger = new ConsoleLogger(LogLevel.debug)
export interface CredentialService {

  createProposal(proposal: ProposeCredentialOptions): Promise<{ credentialRecord: CredentialRecord; message: AgentMessage }>

}


@scoped(Lifecycle.ContainerScoped)
export class CredentialServiceV1 implements CredentialService {

  private credentialService: V1CredentialService
  private connectionService: ConnectionService
  private messageSender: MessageSender

  constructor(connectionService: ConnectionService, 
              credentialService: V1CredentialService,
              messageSender: MessageSender) {
    this.credentialService = credentialService
    this.connectionService = connectionService
    this.messageSender = messageSender
  }


  public async createProposal(proposal: ProposeCredentialOptions): Promise<{ credentialRecord: CredentialRecord; message: AgentMessage }> {
    logger.debug(">> IN SERVICE V1")

    const connection = await this.connectionService.getById(proposal.connectionId)

    if (proposal?.credentialFormats.indy?.attributes) {
      proposal.credentialFormats.indy.credentialProposal = new CredentialPreview({ attributes: proposal?.credentialFormats.indy?.attributes })
    }

    const config: CredentialProposeOptions = {
      credentialProposal: proposal.credentialFormats.indy?.credentialProposal,
      credentialDefinitionId: proposal.credentialFormats.indy?.credentialDefinitionId,
    }

    logger.debug("Create Proposal")
    const { credentialRecord, message } = await this.credentialService.createProposal(connection, config)

    const outbound = createOutboundMessage(connection, message)

    logger.debug("Send Proposal to Issuer")
    await this.messageSender.sendMessage(outbound)

    return { credentialRecord, message }
  }

}

interface CredentialFormatService {
  getProposeFormat(credType: CredentialRecordType): ProposeCredentialFormats

  // other message formats here...eg issue, request formats etc.
}

export class CredentialFormatServiceV1 implements CredentialFormatService {
  private getFormatService(): CredentialFormatService {
    return new CredentialFormatServiceV1()
  }
  public getProposeFormat(credType: CredentialRecordType): ProposeCredentialFormats {
    const indyFormat: ProposeCredentialFormats = { indy: {} }
    return indyFormat
  }
}


export class CredentialFormatServiceV2 implements CredentialFormatService {
  public getProposeFormat(credType: CredentialRecordType): ProposeCredentialFormats {
    let format: ProposeCredentialFormats = {
      // dummy values
      w3c: {
        credential: {
          '@context': "",
          issuer: "",
          type: "",
          issuanceDate: "",
          x: ""
        }, format: {
          linkedDataProof: {
            proofType: []
          }
        }
      }
    }

    if (credType === CredentialRecordType.INDY) {
      format = { indy: {} }
    }
    // can be either indy or linked data (for now)
    return format
  }
}

export class CredentialServiceV2 implements CredentialService {

  private credentialService: V1CredentialService
  private connectionService: ConnectionService
  private messageSender: MessageSender

  constructor(connectionService: ConnectionService, 
              credentialService: V1CredentialService,
              messageSender: MessageSender) {
    this.credentialService = credentialService
    this.connectionService = connectionService
    this.messageSender = messageSender
  }


  private getFormatService(): CredentialFormatService {
    return new CredentialFormatServiceV2()
  }

  public async createProposal(proposal: ProposeCredentialOptions): Promise<{ credentialRecord: CredentialRecord; message: AgentMessage }> {
    // should handle all formats in proposal.credentialFormats by querying and calling
    // its corresponding handler classes.

    logger.debug(">> IN SERVICE V2")

    const connection = await this.connectionService.getById(proposal.connectionId)

    if (proposal?.credentialFormats.indy?.attributes) {
      proposal.credentialFormats.indy.credentialProposal = new CredentialPreview({ attributes: proposal?.credentialFormats.indy?.attributes })
    }

    const config: CredentialProposeOptions = {
      credentialProposal: proposal.credentialFormats.indy?.credentialProposal,
      credentialDefinitionId: proposal.credentialFormats.indy?.credentialDefinitionId,
    }

    logger.debug("Create Proposal")
    const { credentialRecord, message } = await this.credentialService.createProposal(connection, config)

    const outbound = createOutboundMessage(connection, message)

    logger.debug("Send Proposal to Issuer")
    await this.messageSender.sendMessage(outbound)

    return { credentialRecord, message }
  }


}

// TODO move into separate file
@scoped(Lifecycle.ContainerScoped)
export class CredentialAPI extends CredentialsModule implements CredentialsAPI {
  private credentialRepository: CredentialRepository
  private eventEmitter: EventEmitter
  private connService: ConnectionService
  private msgSender: MessageSender
  private v1CredentialService: V1CredentialService


  public constructor(
    dispatcher: Dispatcher,
    credentialRepository: CredentialRepository,
    messageSender: MessageSender,
    connectionService: ConnectionService,
    eventEmitter: EventEmitter,
    agentConfig: AgentConfig,
    credentialResponseCoordinator: CredentialResponseCoordinator,
    mediationRecipientService: MediationRecipientService,
    v1CredentialService: V1CredentialService

  ) {
    super(
      dispatcher,
      connectionService,
      v1CredentialService,
      messageSender,
      agentConfig,
      credentialResponseCoordinator,
      mediationRecipientService)
    this.v1CredentialService = v1CredentialService
    this.credentialRepository = credentialRepository
    this.msgSender = messageSender
    this.connService = connectionService
    this.eventEmitter = eventEmitter
  }

  // public getById(credentialRecordId: string): Promise<CredentialExchangeRecord> {

  //   // TODO
  // }

  private getService(protocolVersion: CredentialProtocolVersion) {
    const serviceMap = {
      [CredentialProtocolVersion.V1_0]: CredentialServiceV1,
      [CredentialProtocolVersion.V2_0]: CredentialServiceV2,
    }
    return new serviceMap[protocolVersion](this.connService, this.v1CredentialService, this.msgSender)
  }

  public getByIdV2(credentialRecordId: string): Promise<CredentialRecord> {
    return super.getById(credentialRecordId)
  }

  // // old v1 call
  // public async proposeCredential(connectionId: string, config?: CredentialProposeOptions) {
  //   return this.credentialsModule.proposeCredential(connectionId, config)
  // }

  /**
   * Initiate a new credential exchange as holder by sending a credential proposal message
   * to the connection with the specified credential options
   *
   * @param credentialOptions configuration to use for the proposal
   * @returns Credential exchange record associated with the sent proposal message
  */

  public async proposeCredential(credentialOptions: ProposeCredentialOptions): Promise<CredentialExchangeRecord> {

    logger.debug("In new Credential API...")

    // get the version
    const version: CredentialProtocolVersion = credentialOptions.protocolVersion

    logger.debug(`version =${version}`)

    // with version we can get the Service
    const service: CredentialService = this.getService(version)

    logger.debug("Got a CredentialService object for this version")

    // will get back a credential record -> map to Credential Exchange Record
    const { credentialRecord, message } = await service.createProposal(credentialOptions)

    const recordBinding: CredentialRecordBinding = {
      credentialRecordType: credentialOptions.credentialFormats.indy ? CredentialRecordType.INDY : CredentialRecordType.W3C,
      credentialRecordId: credentialRecord.id
    }

    const bindings: CredentialRecordBinding[] = []
    bindings.push(recordBinding)


    const credentialExchangeRecord: CredentialExchangeRecord = {
      ...credentialRecord,
      protocolVersion: version, 
      state: CredentialState.ProposalSent,
      role: CredentialRole.Holder,
      credentials: bindings,
      
    }

    return credentialExchangeRecord
  }
}
