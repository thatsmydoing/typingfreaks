import * as audio from '../audio';

export class WaveForm {
  ctx: CanvasRenderingContext2D;
  overlayCtx: CanvasRenderingContext2D;
  track: audio.FileTrack | null = null;
  data: Float32Array | null = null;
  stride: number = 0;
  currentSection: number = -1;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly overlay: HTMLCanvasElement,
    readonly setTime: (time: number) => void
  ) {
    canvas.height = canvas.clientHeight;
    canvas.width = canvas.clientWidth;
    overlay.height = overlay.clientHeight;
    overlay.width = overlay.clientWidth;
    this.ctx = canvas.getContext('2d')!;
    this.overlayCtx = overlay.getContext('2d')!;

    this.ctx.fillStyle = 'forestgreen';
    this.overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';

    this.overlay.addEventListener('click', (event: MouseEvent) => {
      let pos = event.clientX - this.overlay.offsetLeft;
      let percentage = pos / this.overlay.width;
      let time = this.currentSection * 5 + percentage * 5;
      this.setTime(time);
    });
  }

  clear(): void {
    this.track = null;
  }

  setTrack(track: audio.FileTrack): void {
    this.track = track;
    this.stride = Math.floor(
      (this.track.buffer.sampleRate / this.canvas.width) * 5
    );
    this.currentSection = -1;
  }

  timeToX(time: number): number {
    return ((time - this.currentSection * 5) / 5) * this.canvas.width;
  }

  update(times: number[]): void {
    const section = Math.floor(this.track!.getTime() / 5);

    const height = this.canvas.height;
    const midPoint = Math.floor(height / 2);
    this.ctx.fillRect(0, midPoint, this.canvas.width, 1);
    if (this.currentSection != section) {
      this.data = this.track!.buffer.getChannelData(0);
      this.ctx.clearRect(0, 0, this.canvas.width, height);
      let offset = section * this.canvas.width * this.stride;
      for (let i = 0; i < this.canvas.width; ++i) {
        let index = offset + i * this.stride;
        let max = -1;
        let min = 1;
        for (let j = index; j < index + this.stride; ++j) {
          const value = this.data[j];
          max = Math.max(value, max);
          min = Math.min(value, min);
        }

        let positiveHeight = midPoint + Math.round(midPoint * max);
        let negativeHeight = midPoint + Math.round(midPoint * min);

        const barHeight = Math.max(1, positiveHeight - negativeHeight);
        this.ctx.fillRect(i, negativeHeight, 1, barHeight);
      }
      this.currentSection = section;
    }

    let marker = this.timeToX(this.track!.getTime());
    this.overlayCtx.clearRect(0, 0, this.canvas.width, height);
    this.overlayCtx.fillRect(0, 0, marker, height);
    times.forEach((time) => {
      if (time > section * 5 && time <= section * 5 + 5) {
        let x = this.timeToX(time);
        this.overlayCtx.beginPath();
        this.overlayCtx.moveTo(x, 0);
        this.overlayCtx.lineTo(x, height);
        this.overlayCtx.stroke();
      }
    });
  }
}
