import { V2CredentialFormatSpec } from '../formats/V2CredentialFormat'
import { Attachment } from '../../../../decorators/attachment/Attachment'
import { ProposeCredentialOptions } from '../interfaces'
import { uuid } from '../../../../utils/uuid'
import { CredentialPreview } from '../../CredentialPreview'
import { CredentialRepository } from '../../repository'
import { EventEmitter } from '../../../../agent/EventEmitter'
import { V2CredentialRecord } from '../V2CredentialRecord'
import { CredentialEventTypes, CredentialStateChangedEvent } from '../../CredentialEvents'

export interface AttachmentFormats {
    preview?: CredentialPreview
    formats: V2CredentialFormatSpec,
    filtersAttach: Attachment
}

export abstract class CredentialFormatService {

    private credentialRepository: CredentialRepository
    private eventEmitter: EventEmitter

    public constructor(
        credentialRepository: CredentialRepository,
        eventEmitter: EventEmitter
    ) {
        this.credentialRepository = credentialRepository
        this.eventEmitter = eventEmitter
    }
    abstract getCredentialProposeAttachFormats(proposal: ProposeCredentialOptions, messageType: string): AttachmentFormats
    abstract getFormatIdentifier(messageType: string): V2CredentialFormatSpec
    abstract getFormatData(messageType: string, data: ProposeCredentialOptions): Attachment
    abstract save(proposal: ProposeCredentialOptions, credentialRecord: V2CredentialRecord): Promise<void>

    // other message formats here...eg issue, request formats etc.


    public generateId(): string {
        return uuid()
    }

    public getType(): string {
        return this.constructor.name
    }

    public async emitEvent(credentialRecord: V2CredentialRecord) {
        await this.credentialRepository.save(credentialRecord)
        this.eventEmitter.emit<CredentialStateChangedEvent>({
          type: CredentialEventTypes.CredentialStateChanged,
          payload: {
            credentialRecord,
            previousState: null,
          },
        })
    }
}

