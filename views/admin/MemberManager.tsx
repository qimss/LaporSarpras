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
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const resetForm = () => {
    setEditingId(null);
    setNim('');
    setNamaLengkap('');
    setEmail('');
    setPassword('');
    setRole('mahasiswa');
  };

  const handleStartEdit = (member: MemberItem) => {
    setEditingId(member.user_id);
    setNim(member.nim);
    setNamaLengkap(member.nama_lengkap);
    setEmail(member.email);
    setPassword('');
    setRole(member.role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nim.trim() || !namaLengkap.trim() || !email.trim()) {
      onNotify?.('NIM/ID, Nama Lengkap, dan Email wajib diisi.', 'error');
      return;
    }

    if (editingId === null && !password.trim()) {
      onNotify?.('Kata Sandi wajib diisi untuk anggota baru.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId !== null ? `/api/users/${editingId}` : '/api/users';
      const method = editingId !== null ? 'PUT' : 'POST';

      const payload: Record<string, string> = {
        nim: nim.trim(),
        nama_lengkap: namaLengkap.trim(),
        email: email.trim(),
        role,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        onNotify?.(data.message || 'Gagal menyimpan data anggota.', 'error');
        return;
      }

      onNotify?.(
        editingId !== null
          ? `Anggota "${data.user.nama_lengkap}" berhasil diperbarui.`
          : `Anggota "${data.user.nama_lengkap}" berhasil ditambahkan.`,
        'success'
      );
      resetForm();
      await fetchMembers();
    } catch {
      onNotify?.('Gagal terhubung ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (member: MemberItem) => {
    const confirmed = window.confirm(
      `Hapus anggota "${member.nama_lengkap}" (${member.nim})?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${member.user_id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        onNotify?.(data.message || 'Gagal menghapus anggota.', 'error');
        return;
      }

      if (editingId === member.user_id) {
        resetForm();
      }
      onNotify?.(`Anggota "${member.nama_lengkap}" berhasil dihapus.`, 'success');
      await fetchMembers();
    } catch {
      onNotify?.('Gagal terhubung ke server.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <form
        onSubmit={handleSubmit}
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
            {editingId !== null ? 'Edit Data Anggota' : 'Tambah Anggota Baru'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748B' }}>
            {editingId !== null
              ? 'Perbarui informasi anggota. Kosongkan kata sandi jika tidak ingin mengubahnya.'
              : 'Daftarkan akun mahasiswa atau staf/admin Sarpras baru ke sistem.'}
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
            {editingId !== null ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi *'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={editingId !== null ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
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

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
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
            {submitting
              ? 'Menyimpan...'
              : editingId !== null
              ? 'Simpan Perubahan'
              : '+ Tambah Anggota'}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
          )}
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
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Aksi</th>
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
                  <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(m)}
                      style={{
                        padding: '6px 11px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginRight: '6px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      style={{
                        padding: '6px 11px',
                        borderRadius: '8px',
                        border: '1px solid #FCA5A5',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Hapus
                    </button>
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