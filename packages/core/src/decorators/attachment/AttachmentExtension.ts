import type { BaseMessageConstructor } from '../../agent/BaseMessage'
import type { CredentialFormatSpec } from '../../modules/credentials/formats/models/CredentialFormatServiceOptions'

import { Expose, Type } from 'class-transformer'
import { IsInstance, IsOptional, ValidateNested } from 'class-validator'

import { Attachment } from './Attachment'

export function AttachmentDecorated<T extends BaseMessageConstructor>(Base: T) {
  class AttachmentDecoratorExtension extends Base {
    /**
     * The ~attach decorator is required for appending attachments to a preview
     */
    @Expose({ name: '~attach' })
    @Type(() => Attachment)
    @ValidateNested()
    @IsInstance(Attachment, { each: true })
    @IsOptional()
    public appendedAttachments?: Attachment[]

    public formats!: CredentialFormatSpec[]

    public messageAttachment!: Attachment[]

    public getAppendedAttachmentById(id: string): Attachment | undefined {
      return this.appendedAttachments?.find((attachment) => attachment.id === id)
    }

    public addAppendedAttachment(attachment: Attachment): void {
      if (this.appendedAttachments) {
        this.appendedAttachments?.push(attachment)
      } else {
        this.appendedAttachments = [attachment]
      }
    }
  }

  return AttachmentDecoratorExtension
}
