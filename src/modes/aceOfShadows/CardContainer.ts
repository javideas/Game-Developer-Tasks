import { Container, Sprite, Texture } from 'pixi.js';

/**
 * CardContainer - A proper class for card sprites with face/back state tracking.
 *
 * This replaces the previous pattern of using type assertions:
 * `new Container() as CardContainer`
 *
 * Benefits:
 * - Type-safe construction with required parameters
 * - Encapsulated card-specific logic
 * - No type assertions needed
 * - Better IDE support and refactoring
 */
export class CardContainer extends Container {
  /** The texture for the card's face */
  public faceTexture: Texture;

  /** The texture name (e.g., 'sprite-1-1.png') for deck identification */
  public textureName: string;

  /** Whether the card is currently showing its face (true) or back (false) */
  public isShowingFace: boolean;

  /**
   * Create a new CardContainer
   * @param faceTexture - The texture for the card's face
   * @param textureName - The name of the texture for deck identification
   */
  constructor(faceTexture: Texture, textureName: string) {
    super();
    this.faceTexture = faceTexture;
    this.textureName = textureName;
    this.isShowingFace = true;
  }

  /**
   * Get the card sprite (the visual representation of the card)
   * The card sprite is expected to be named 'cardSprite'
   */
  public getCardSprite(): Sprite | null {
    return this.getChildByName('cardSprite') as Sprite | null;
  }

  /**
   * Get the shadow sprite attached to this card
   * The shadow is the first child (added before the card sprite)
   */
  public getCardShadow(): Sprite | null {
    if (this.children.length > 1) {
      return this.children[0] as Sprite;
    }
    return null;
  }

  /**
   * Flip the card to show its face
   * @param faceTexture - Optional new face texture (uses stored faceTexture if not provided)
   */
  public showFace(faceTexture?: Texture): void {
    const sprite = this.getCardSprite();
    if (sprite) {
      sprite.texture = faceTexture ?? this.faceTexture;
      this.isShowingFace = true;
    }
  }

  /**
   * Flip the card to show its back
   * @param backTexture - The texture for the card's back
   */
  public showBack(backTexture: Texture): void {
    const sprite = this.getCardSprite();
    if (sprite) {
      sprite.texture = backTexture;
      this.isShowingFace = false;
    }
  }
}
