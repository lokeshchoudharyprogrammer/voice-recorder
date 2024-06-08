
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface Time {
  h: number;
  m: number;
  s: number;
}

interface Data {
  url?: string;
  blob?: Blob;
}

interface RecordUiProps {
  time: Time;
  stop: () => void;
  data: Data;
  start: () => void;
  pause: () => void;
  resume: () => void;
  paused: boolean;
  recording: boolean;
}

function RecordUi({
  time,
  stop,
  data,
  start,
  pause,
  resume,
  paused,
  recording,
}: RecordUiProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer>();
  const [hasRecording, setHasRecording] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const togglePlay = () => {
    if (audioRef.current?.paused) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
    }
  };

  useEffect(() => {
    if (data.url && audioRef.current) {
      audioRef.current.src = data.url;
      waveSurferRef.current?.load(data.url);
    }
  }, [data.url]);

  useEffect(() => {
    if (waveRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: waveRef.current,
        waveColor: "violet",
        progressColor: "purple",
      });
    }

    return () => {
      waveSurferRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (recording) {
      const context = new AudioContext();
      setAudioContext(context);
      const analyzerNode = context.createAnalyser();
      setAnalyzer(analyzerNode);
      analyzerNode.fftSize = 2048;
      const bufferLength = analyzerNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (navigator.mediaDevices) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            const source = context.createMediaStreamSource(stream);
            source.connect(analyzerNode);
            drawWaveform(analyzerNode, dataArray, bufferLength);
          })
          .catch((err) => console.error("Error accessing microphone: ", err));
      }
    } else {
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [recording]);

  const drawWaveform = (
    analyzerNode: AnalyserNode,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyzerNode.getByteTimeDomainData(dataArray);
      if (canvasCtx) {
        canvasCtx.fillStyle = "rgb(200, 200, 200)";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "rgb(0, 0, 0)";

        canvasCtx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      }
    };

    draw();
  };

  const uploadAudio = async () => {
    if (!data.blob) {
      console.log("No recorded data to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("audio", data.blob, "recording.wav");

    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
      mode: "cors",
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.log(errorMessage);
      return;
    }

    if (response.status === 200) {
      alert("Uploaded Voice.");
    } else {
      alert("Voice Not Uploaded.");
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "23px",
          marginTop: "45px",
          marginBottom: "45px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (recording) {
              stop();
              setHasRecording(true);
            } else {
              start();
              setHasRecording(false);
            }
          }}
          style={{ margin: "10px", padding: "10px", cursor: "pointer" }}
        >
          {recording ? (
            <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
              Stop
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
              Start
            </div>
          )}
        </button>
{
    data.url?    <audio ref={audioRef} src={data.url} controls />: <canvas ref={canvasRef} width="500" height="100" />
}
        {recording && (
          <>
            <button
              type="button"
              onClick={() => {
                if (recording) {
                  if (paused) resume();
                  else pause();
                }
              }}
              style={{ margin: "10px", padding: "10px", cursor: "pointer" }}
            >
              {paused ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "13px" }}
                >
                  Resume
                </div>
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "13px" }}
                >
                  Pause
                </div>
              )}
            </button>
            <p>
              {time.h}:{time.m}:{time.s}
            </p>
          </>
        )}

        {!recording && hasRecording && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              style={{ margin: "10px", padding: "10px", cursor: "pointer" }}
            >
              Play/Pause
            </button>
          </>
        )}
     

        {data?.url ? (
          <button
            type="button"
            onClick={uploadAudio}
            style={{
              margin: "10px",
              padding: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "13px",
            }}
          >
            Upload
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default RecordUi;
