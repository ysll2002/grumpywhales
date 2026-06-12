import { ImageResponse } from 'next/og';

export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt         = 'GrumpyWhales — Free invoicing with automatic payment tracking';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#0E1116',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 80,
        }}
      >
        <div style={{
          display: 'flex',
          padding: '6px 14px',
          borderRadius: 999,
          background: '#1E4736',
          color: '#34D399',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1.5,
          marginBottom: 32,
        }}>
          FREE · NO CARD REQUIRED
        </div>
        <div style={{
          fontSize: 96,
          fontWeight: 800,
          color: '#E8EAED',
          textAlign: 'center',
          lineHeight: 1.05,
          marginBottom: 24,
        }}>
          Get paid faster.
        </div>
        <div style={{
          fontSize: 96,
          fontWeight: 800,
          color: '#5BA3F5',
          textAlign: 'center',
          lineHeight: 1.05,
          marginBottom: 40,
        }}>
          Without nagging.
        </div>
        <div style={{
          fontSize: 28,
          color: '#8B949E',
          textAlign: 'center',
          maxWidth: 900,
        }}>
          Invoicing + automatic bank reconciliation for UK freelancers
        </div>
        <div style={{
          marginTop: 60,
          fontSize: 32,
          fontWeight: 700,
          color: '#5BA3F5',
          letterSpacing: 0.5,
        }}>
          grumpywhales.com
        </div>
      </div>
    ),
    { ...size },
  );
}
