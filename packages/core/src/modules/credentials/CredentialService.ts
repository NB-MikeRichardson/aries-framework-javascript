import { AgentMessage } from '@aries-framework/core'
import { CredentialRecordType } from './v2/CredentialExchangeRecord'
import { ProposeCredentialOptions } from './v2/interfaces'
import { CredentialRecord } from './repository'
import { ConsoleLogger, LogLevel } from '../../logger'
import { CredentialProtocolVersion } from './CredentialProtocolVersion'
import { CredentialFormatService } from './v2/formats/CredentialFormatService'

const logger = new ConsoleLogger(LogLevel.debug)

export abstract class CredentialService {
  abstract getVersion(): CredentialProtocolVersion
  abstract createProposal(proposal: ProposeCredentialOptions): Promise<{ credentialRecord: CredentialRecord, message: AgentMessage }>
  getFormatService(_credentialRecordType: CredentialRecordType): CredentialFormatService {
    throw Error("Not Implemented")
  }

}





