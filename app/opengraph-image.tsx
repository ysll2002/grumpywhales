import { ImageResponse } from 'next/og';

export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt         = 'GrumpyWhales — Create paid events. Get paid on time.';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#FAF7F0',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 80,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,168,89,0.06) 0 1px, transparent 1px 80px),' +
            'repeating-linear-gradient(90deg, rgba(0,168,89,0.04) 0 1px, transparent 1px 80px)',
        }}
      >
        <div style={{
          display: 'flex',
          padding: '8px 18px',
          borderRadius: 999,
          background: '#FFD600',
          color: '#0A0A0A',
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 2,
          marginBottom: 36,
        }}>
          FREE · NO CARD REQUIRED
        </div>
        <div style={{
          display: 'flex',
          fontSize: 96,
          fontWeight: 800,
          color: '#0F1A14',
          textAlign: 'center',
          lineHeight: 1.05,
          marginBottom: 16,
        }}>
          Create an event.
        </div>
        <div style={{
          display: 'flex',
          fontSize: 96,
          fontWeight: 800,
          color: '#00A859',
          textAlign: 'center',
          lineHeight: 1.05,
          marginBottom: 40,
        }}>
          Get paid on time.
        </div>
        <div style={{
          display: 'flex',
          fontSize: 28,
          color: '#6B6B6B',
          textAlign: 'center',
          maxWidth: 900,
        }}>
          Paid-event hosting for UK organisers — fees collected, late payers chased.
        </div>
        <div style={{
          display: 'flex',
          marginTop: 60,
          fontSize: 32,
          fontWeight: 700,
          color: '#0A4D2E',
          letterSpacing: 0.5,
        }}>
          grumpywhales.com
        </div>
      </div>
    ),
    { ...size },
  );
}
