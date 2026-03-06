class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 100ms at 16kHz = 1600 samples. Smaller for better responsiveness.
    this.bufferSize = 1600;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    if (inputs.length > 0 && inputs[0].length > 0) {
      const inputChannel = inputs[0][0];

      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];

        if (this.bufferIndex >= this.bufferSize) {
          // Send a copy and reset
          this.port.postMessage(new Float32Array(this.buffer));
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder-processor", PCMProcessor);
