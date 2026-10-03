export function createAudio() {
  let ctx: AudioContext | undefined,
    osc: OscillatorNode | undefined,
    gain: GainNode | undefined,
    enabled = true;
  return {
    setEnabled(v: boolean) {
      enabled = v;
      if (gain && !v) gain.gain.value = 0;
    },
    async unlock() {
      if (!ctx) {
        ctx = new AudioContext();
        osc = ctx.createOscillator();
        gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0;
        osc.start();
      }
      await ctx.resume();
    },
    update(speed: number, running: boolean) {
      if (!ctx || !osc || !gain) return;
      osc.frequency.setTargetAtTime(
        38 + Math.abs(speed) * 3.8,
        ctx.currentTime,
        0.12,
      );
      gain.gain.setTargetAtTime(
        enabled && running ? 0.012 + Math.abs(speed) * 0.00025 : 0,
        ctx.currentTime,
        0.1,
      );
    },
    beep(high = false) {
      if (!ctx || !enabled) return;
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = high ? 880 : 440;
      g.gain.setValueAtTime(0.055, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      o.start();
      o.stop(ctx.currentTime + 0.23);
    },
  };
}
