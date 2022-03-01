import type { KeyType } from '.'
import type { Wallet } from '..'
import type { Buffer } from '../utils/buffer'

import { AriesFrameworkError } from '..'

import { Key } from './Key'
import { KeyPair } from './KeyPair'

export class WalletKeyPair extends KeyPair {
  private wallet: Wallet
  private keyType: KeyType
  private key?: Key

  public constructor(wallet: Wallet, keyType: KeyType, publicKeyBase58?: string) {
    super()
    this.wallet = wallet
    this.keyType = keyType
    if (publicKeyBase58) {
      this.key = Key.fromPublicKeyBase58(publicKeyBase58, keyType)
    }
  }

  public async sign(message: Buffer): Promise<Buffer> {
    if (!this.key) {
      throw new AriesFrameworkError('Unable to sign message with WalletKey: No key to sign with')
    }

    return await this.wallet.sign(message, this.key.publicKeyBase58)
  }
  public async verify(message: Buffer, signature: Buffer): Promise<boolean> {
    if (!this.key) {
      throw new AriesFrameworkError('Unable to verify message with WalletKey: No key to verify with')
    }

    return await this.wallet.verify(this.key.publicKeyBase58, message, signature)
  }
  public get hasPublicKey(): boolean {
    return this.key !== undefined
  }

  public get publicKey(): Buffer | undefined {
    return this.key ? this.key.publicKey : undefined
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public fromVerificationMethod(verificationMethod: Record<string, any>): KeyPair {
    if (!verificationMethod.publicKeyBase58) {
      throw new AriesFrameworkError('Unable to set public key from verification method: no publicKeyBase58')
    }

    return new WalletKeyPair(this.wallet, this.keyType, verificationMethod.publicKeyBase58)
  }
}
