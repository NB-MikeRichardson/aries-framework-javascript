import { AgentMessage, AgentConfig } from '@aries-framework/core'
import { CredentialService } from '../CredentialService'
import { ProposeCredentialOptions } from './interfaces'
import { CredentialRecord, CredentialRepository } from '../repository'
import { EventEmitter } from '../../../agent/EventEmitter'
import { CredentialRecordType } from './CredentialExchangeRecord'
import { CredentialFormatService } from './formats/CredentialFormatService'
import { ConsoleLogger, LogLevel } from '../../../logger'
import { CredentialProtocolVersion } from '../CredentialProtocolVersion'
import { IndyCredentialFormatService } from './formats/indy/IndyCredentialFormatService'
import { JsonLdCredentialFormatService } from './formats/jsonld/JsonLdCredentialFormatService'
import { CredentialMessageBuilder } from './CredentialMessageBuilder'
import { Lifecycle, scoped } from 'tsyringe'
import { V1CredentialService } from '../v1/CredentialServiceV1' // tmp
import { ConnectionService } from '../../connections/services/ConnectionService'
import { HandlerInboundMessage } from 'packages/core/src/agent/Handler'
import { V2ProposeCredentialHandler } from './handlers/V2ProposeCredentialHandler'
import { Dispatcher } from '../../../agent/Dispatcher'
import { CredentialResponseCoordinator } from '../CredentialResponseCoordinator'


const logger = new ConsoleLogger(LogLevel.debug)

@scoped(Lifecycle.ContainerScoped)
export class V2CredentialService extends CredentialService {
  processProposal(messageContext: HandlerInboundMessage<V2ProposeCredentialHandler>): Promise<CredentialRecord> {
    throw new Error("Method not implemented.")
  }

  private credentialService: V1CredentialService // Temporary while v1 constructor needs this
  private connectionService: ConnectionService
  private credentialRepository: CredentialRepository
  private eventEmitter: EventEmitter
  private agentConfig: AgentConfig
  private credentialResponseCoordinator: CredentialResponseCoordinator

  constructor(connectionService: ConnectionService,
    credentialService: V1CredentialService,
    credentialRepository: CredentialRepository,
    eventEmitter: EventEmitter,
    dispatcher: Dispatcher,
    agentConfig: AgentConfig,
    credentialResponseCoordinator: CredentialResponseCoordinator
  ) {
    super()
    this.credentialRepository = credentialRepository
    this.eventEmitter = eventEmitter
    this.credentialService = credentialService
    this.connectionService = connectionService
    this.agentConfig = agentConfig
    this.credentialResponseCoordinator = credentialResponseCoordinator
    this.registerV2Handlers(dispatcher)
  }

  public getVersion(): CredentialProtocolVersion {
    return CredentialProtocolVersion.V2_0
  }

  public getFormatService(_credentialRecordType: CredentialRecordType): CredentialFormatService {

    const serviceFormatMap = {
      [CredentialRecordType.INDY]: IndyCredentialFormatService,
      [CredentialRecordType.W3C]: JsonLdCredentialFormatService,
    }
    return new serviceFormatMap[_credentialRecordType](this.credentialRepository, this.eventEmitter)
  }

  public async createProposal(proposal: ProposeCredentialOptions): Promise<{ credentialRecord: CredentialRecord, message: AgentMessage }> {
    // should handle all formats in proposal.credentialFormats by querying and calling
    // its corresponding handler classes.
    const connection = await this.connectionService.getById(proposal.connectionId)

    logger.debug(">> IN SERVICE V2")

    const credentialRecordType = proposal.credentialFormats.indy ? CredentialRecordType.INDY : CredentialRecordType.W3C

    logger.debug("Get the Format Service and Create Proposal Message")

    const formatService: CredentialFormatService = this.getFormatService(credentialRecordType)

    const credentialMessageBuilder = new CredentialMessageBuilder()
    const { message, credentialRecord } = credentialMessageBuilder.createProposal(formatService, proposal, connection.threadId)

    logger.debug("Save meta data and emit state change event")
    await formatService.save(proposal, credentialRecord)

    return { credentialRecord, message }
  }

  private registerV2Handlers(dispatcher: Dispatcher) {
    dispatcher.registerHandler(
      new V2ProposeCredentialHandler(this, this.agentConfig, this.credentialResponseCoordinator)
    )
}
}