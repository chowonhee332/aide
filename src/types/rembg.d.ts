// @tugrul/rembg 타입 선언 (패키지에 .d.ts 미포함)
declare module '@tugrul/rembg' {
  import type { Sharp } from 'sharp'
  export default class BackgroundRemover {
    constructor(session: unknown, mean: number[], std: number[])
    normalize(image: Sharp): Promise<unknown>
    mask(image: Sharp): Promise<Sharp>
  }
}
