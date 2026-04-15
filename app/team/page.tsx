// app/team/page.tsx
'use client';

import { useEffect, useState } from 'react';

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch('/api/team');
        const data = await res.json();
        setTeam(data.team || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  if (loading) return <div>Loading team...</div>;

  return (
    <main style={{ padding: '20px' }}>
      <h1>Team Management (Super Admin)</h1>
      <p>Yaha aap sari team, unke roles aur status dekh sakte ho.</p>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px',
        }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', padding: '8px' }}>Name</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '8px' }}>Email</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '8px' }}>Role</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '8px' }}>Status</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {team.map((member) => (
            <tr key={member.id}>
              <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                {member.name}
              </td>
              <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                {member.email}
              </td>
              <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                {member.role}
              </td>
              <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                {member.active ? 'Active' : 'Inactive'}
              </td>
              <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                {/* Yaha future me: change role, reset password, deactivate, etc */}
                <button>Change Role</button>
                <button style={{ marginLeft: '8px' }}>Reset Password</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
