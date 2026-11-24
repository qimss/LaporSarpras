import React, { useState, useEffect } from 'react';

interface MemberItem {
  user_id: number;
  nim: string;
  nama_lengkap: string;
  email: string;
  role: 'admin' | 'mahasiswa';
}

interface MemberManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ onNotify }) => {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [nim, setNim] = useState<string>('');
  const [namaLengkap, setNamaLengkap] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'mahasiswa' | 'admin'>('mahasiswa');

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMembers(data.users || []);
      }
    } catch {
      onNotify?.('Gagal memuat daftar anggota.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nim.trim() || !namaLengkap.trim() || !email.trim() || !password.trim()) {
      onNotify?.('NIM/ID, Nama Lengkap, Email, dan Kata Sandi wajib diisi.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nim: nim.trim(),
          nama_lengkap: namaLengkap.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        onNotify?.(data.message || 'Gagal menambahkan anggota.', 'error');
        return;
      }

      onNotify?.(`Anggota "${data.user.nama_lengkap}" berhasil ditambahkan!`, 'success');
      setNim('');
      setNamaLengkap('');
      setEmail('');
      setPassword('');
      setRole('mahasiswa');
      await fetchMembers();
    } catch {
      onNotify?.('Gagal terhubung ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <form
        onSubmit={handleAddMember}
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            Tambah Anggota Baru
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748B' }}>
            Daftarkan akun mahasiswa atau staf/admin Sarpras baru ke sistem.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            NIM / ID Staf *
          </label>
          <input
            type="text"
            value={nim}
            onChange={(e) => setNim(e.target.value)}
            placeholder="Contoh: 20240140999"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            Nama Lengkap *
          </label>
          <input
            type="text"
            value={namaLengkap}
            onChange={(e) => setNamaLengkap(e.target.value)}
            placeholder="Nama lengkap anggota"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@mail.umy.ac.id"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            Kata Sandi *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            Peran (Role) *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'mahasiswa' | 'admin')}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            <option value="mahasiswa">Mahasiswa</option>
            <option value="admin">Admin Sarpras</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: submitting ? '#64748B' : '#0F6B54',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Menyimpan...' : '+ Tambah Anggota'}
          </button>
        </div>
      </form>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '16px',
          padding: '22px',
          overflowX: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
          Daftar Anggota Terdaftar ({members.length})
        </h3>
        {loading ? (
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>Memuat data anggota...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '10px 8px' }}>NIM / ID</th>
                <th style={{ padding: '10px 8px' }}>Nama Lengkap</th>
                <th style={{ padding: '10px 8px' }}>Email</th>
                <th style={{ padding: '10px 8px' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 700, color: '#0F172A' }}>{m.nim}</td>
                  <td style={{ padding: '10px 8px', color: '#0F172A' }}>{m.nama_lengkap}</td>
                  <td style={{ padding: '10px 8px', color: '#475569' }}>{m.email}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: m.role === 'admin' ? '#FEF3C7' : '#ECFDF5',
                        color: m.role === 'admin' ? '#92400E' : '#065F46',
                      }}
                    >
                      {m.role === 'admin' ? 'Admin' : 'Mahasiswa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MemberManager;