
import { CredentialRecordType, CredentialExchangeRecord, CredentialRecordBinding } from './v2/CredentialExchangeRecord'
import { CredentialState } from './CredentialState'
import { CredentialProtocolVersion } from './CredentialProtocolVersion'
import { ProposeCredentialOptions } from './v2/interfaces'
import { AgentConfig } from '../../agent/AgentConfig'
import { Dispatcher } from '../../agent/Dispatcher'
import { V1CredentialService } from './v1/CredentialServiceV1'
import { CredentialService } from './CredentialService'
import { ConnectionService } from '../connections/services/ConnectionService'
import { MessageSender } from '../../agent/MessageSender'
import { Lifecycle, scoped } from 'tsyringe'
import { CredentialsModule } from './CredentialsModule'
import { MediationRecipientService } from '../routing'
import { CredentialResponseCoordinator } from './CredentialResponseCoordinator'
import { CredentialRole } from './v2/CredentialRole'
import { CredentialServiceV1 } from './v1/V1CredentialService'
import { V2CredentialService } from './v2/V2CredentialService'
import { unitTestLogger, LogLevel } from '../../logger'
import { createOutboundMessage } from '../../agent/helpers'
import { CredentialRepository } from './repository'
import { EventEmitter } from '../../agent/EventEmitter'



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

}

type Tag = string | boolean | number

@scoped(Lifecycle.ContainerScoped)
export class CredentialsAPI extends CredentialsModule implements CredentialsAPI {
    private connService: ConnectionService
    private msgSender: MessageSender
    private v1CredentialService: V1CredentialService
    private credentialRecordType?: CredentialRecordType
    private credentialRepository: CredentialRepository
    private eventEmitter: EventEmitter
    private dispatcher: Dispatcher
    private agConfig: AgentConfig
    private credentialResponseCoord: CredentialResponseCoordinator

    // note some of the parameters passed in here are temporary, as we intend 
    // to eventually remove CredentialsModule
    public constructor(
        dispatcher: Dispatcher,
        messageSender: MessageSender,
        connectionService: ConnectionService,
        agentConfig: AgentConfig,
        credentialResponseCoordinator: CredentialResponseCoordinator,
        mediationRecipientService: MediationRecipientService,
        v1CredentialService: V1CredentialService,
        credentialRepository: CredentialRepository,
        eventEmitter: EventEmitter,
    ) {
        super(
            dispatcher,
            connectionService,
            v1CredentialService,
            messageSender,
            agentConfig,
            credentialResponseCoordinator,
            mediationRecipientService)
        this.msgSender = messageSender
        this.v1CredentialService = v1CredentialService
        this.connService = connectionService
        this.credentialRepository = credentialRepository
        this.eventEmitter = eventEmitter
        this.dispatcher = dispatcher
        this.agConfig = agentConfig
        this.credentialResponseCoord = credentialResponseCoordinator
    }

    public getService(protocolVersion: CredentialProtocolVersion) {
        const serviceMap = {
            [CredentialProtocolVersion.V1_0]: CredentialServiceV1,
            [CredentialProtocolVersion.V2_0]: V2CredentialService,
        }
        // constructor(connectionService: ConnectionService,
        //     credentialService: V1CredentialService,
        //     credentialRepository: CredentialRepository,
        //     eventEmitter: EventEmitter
        //   ) {
        return new serviceMap[protocolVersion](this.connService,
            this.v1CredentialService,
            this.credentialRepository,
            this.eventEmitter,
            this.dispatcher,
            this.agConfig,
            this.credentialResponseCoord)
    }

    /**
     * Initiate a new credential exchange as holder by sending a credential proposal message
     * to the connection with the specified credential options
     *
     * @param credentialOptions configuration to use for the proposal
     * @returns Credential exchange record associated with the sent proposal message
    */

    public async proposeCredential(credentialOptions: ProposeCredentialOptions): Promise<CredentialExchangeRecord> {

        unitTestLogger("In new Credential API...")

        // get the version
        const version: CredentialProtocolVersion = credentialOptions.protocolVersion

        unitTestLogger(`version =${version}`)
        unitTestLogger(`Credential Record Type = ${this.credentialRecordType}`)

        // with version we can get the Service
        const service: CredentialService = this.getService(version)

        unitTestLogger("Got a CredentialService object for this version")

        const connection = await this.connService.getById(credentialOptions.connectionId)

        // will get back a credential record -> map to Credential Exchange Record
        const { credentialRecord, message } = await service.createProposal(credentialOptions)


        unitTestLogger("We have a connection thread id = " + connection.threadId)

        unitTestLogger("We have a message (sending outbound): ", message)

        // send the message here
        const outbound = createOutboundMessage(connection, message)

        unitTestLogger("Send Proposal to Issuer")
        await this.msgSender.sendMessage(outbound)


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