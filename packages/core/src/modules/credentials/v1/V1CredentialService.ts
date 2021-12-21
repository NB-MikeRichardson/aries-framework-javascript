
import { AgentMessage } from '@aries-framework/core'
import { CredentialService } from '../CredentialService'
import { ProposeCredentialOptions } from '../v2/interfaces'
import { CredentialPreview } from '../CredentialPreview'
import { CredentialProposeOptions } from '.'
import { V1CredentialService } from './CredentialServiceV1'
import { ConnectionService } from '../../connections/services/ConnectionService'
import { CredentialRecord } from '../repository'
import { Lifecycle, scoped } from 'tsyringe'
import { CredentialRepository } from '../repository'
import { EventEmitter } from '../../../agent/EventEmitter'
import { ConsoleLogger, LogLevel } from '../../../logger'
import { CredentialProtocolVersion } from '../CredentialProtocolVersion'

const logger = new ConsoleLogger(LogLevel.debug)

@scoped(Lifecycle.ContainerScoped)
export class CredentialServiceV1 extends CredentialService {

  private credentialService: V1CredentialService // TODO move all functionality from that class into here
  private connectionService: ConnectionService
  private credentialRepository: CredentialRepository
  private eventEmitter: EventEmitter

  constructor(connectionService: ConnectionService,
    credentialService: V1CredentialService,
    credentialRepository: CredentialRepository,
    eventEmitter: EventEmitter
  ) {
    super()
    this.credentialRepository = credentialRepository
    this.eventEmitter = eventEmitter
    this.credentialService = credentialService
    this.connectionService = connectionService
  }

  public getVersion() : CredentialProtocolVersion {
    return CredentialProtocolVersion.V1_0
  }
  
  
  public async createProposal(proposal: ProposeCredentialOptions): Promise<{ credentialRecord: CredentialRecord, message: AgentMessage }> {
    logger.debug(">> IN SERVICE V1")

    const connection = await this.connectionService.getById(proposal.connectionId)

    let credentialProposal: CredentialPreview | undefined
    if (proposal?.credentialFormats.indy?.attributes) {
      credentialProposal = new CredentialPreview({ attributes: proposal?.credentialFormats.indy?.attributes })
    }

    const config: CredentialProposeOptions = {
      credentialProposal: credentialProposal,
      credentialDefinitionId: proposal.credentialFormats.indy?.credentialDefinitionId,
    }

    logger.debug("Create Proposal")
    return await this.credentialService.createProposal(connection, config)
  }

}
