import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const TIPO_BADGE: any = {
  Retira: '#993C1D',
  Entrega: '#185FA5',
  Troca: '#854F0B',
  'Carrega na hora': '#3B6D11',
};
const STATUS_COR: any = {
  aguardando: '#888',
  'em rota': '#D85A30',
  'check-in': '#0F6E56',
  retornando: '#854F0B',
  concluído: '#1a7a3c',
};
const MOTORISTAS: any = {
  FOD2B51: 'CLAYTON',
  EMA4A65: 'BENEDITO APARECIDO',
  FXW2F63: 'MARINALDO',
  GHT7E86: 'DANIEL',
  FXP8D02: 'DENIVALDO',
  BYR1G92: 'JOEL',
  CRY3C31: 'BRUNO',
  FAT9J04: 'EMERSON',
  DVN7C59: 'KEVIN',
  EAU4I92: 'KEVIN',
  TJN1F53: 'JOSE MARCOS',
  UDA1B60: 'ALBERTO',
  UEV3D14: 'PAULO BENEDITO',
  UGN0A28: 'JOSE OSMAR',
  UFL8E39: 'JAMILE DOS SANTOS',
  GCU58D24: 'FELIPE',
};
const BUCKET = 'FOTOS-COLETA';

function formatHora(iso: string) {
  const date = new Date(iso);
  const brMs = date.getTime() - 3 * 60 * 60 * 1000;
  const br = new Date(brMs);
  return br.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function uploadFoto(file: File, path: string): Promise<string | null> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) {
    alert('Erro ao enviar foto: ' + error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function FotoBtn({
  label,
  onFoto,
}: {
  label: string;
  onFoto: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const url = await uploadFoto(file, `${Date.now()}-${file.name}`);
    if (url) {
      setPreview(url);
      onFoto(url);
    }
    setLoading(false);
  }
  return (
    <div style={{ marginBottom: '8px' }}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {preview ? (
        <div style={{ position: 'relative' }}>
          <img
            src={preview}
            style={{
              width: '100%',
              borderRadius: '8px',
              maxHeight: '160px',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
            }}
          >
            ✅ {label}
          </div>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          style={{
            width: '100%',
            padding: '10px',
            background: '#f5f5f5',
            border: '1px dashed #ccc',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#666',
          }}
        >
          {loading ? '⏳ Enviando...' : `📷 ${label}`}
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [tela, setTela] = useState('motorista');
  const [senhaOk, setSenhaOk] = useState(false);
  const [filtroDt, setFiltroDt] = useState(() => new Date().toISOString().slice(0, 10));
  const [ordens, setOrdens] = useState<any[]>([]);
  const [form, setForm] = useState({
    placa: '',
    motorista: '',
    tipo: 'Caminhão comum',
    operacao: 'Retira',
    fornecedor: '',
    local: '',
    endereco: '',
    num_cacamba: '',
    tipo_cacamba: 'Indústria',
    hora_prevista: '08:00',
    observacao: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [placaSel, setPlacaSel] = useState('');
  const [fotos, setFotos] = useState<any>({});

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from('ordens')
      .select('*')
      .order('criado_em', { ascending: false });
    setOrdens(data || []);
  }

  function exportarCSV() {
    const cabecalho = ['Placa','Motorista','Fornecedor','Local','Endereço','Operação','Tipo Veículo','Nº Caçamba','Tipo Caçamba','Hora Prevista','Status','Saída','Check-in','Retorno','Observação'];
    const linhas = ordens.map((o: any) => [
      o.placa, o.motorista, o.fornecedor, o.local, o.endereco || '—',
      o.operacao, o.tipo, o.num_cacamba || '—', o.tipo_cacamba,
      o.hora_prevista || '—', o.status,
      o.hora_saida ? formatHora(o.hora_saida) : '—',
      o.hora_checkin ? formatHora(o.hora_checkin) : '—',
      o.hora_retorno ? formatHora(o.hora_retorno) : '—',
      o.observacao || '',
    ]);
    const csv = [cabecalho, ...linhas].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordens_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function salvarOrdem() {
    if (!form.placa || !form.fornecedor)
      return alert('Placa e fornecedor obrigatórios!');
    const { error } = await supabase.from('ordens').insert([{ ...form }]);
    if (error) {
      alert('Erro: ' + error.message);
      return;
    }
    setShowForm(false);
    setForm({
      placa: '',
      motorista: '',
      tipo: 'Caminhão comum',
      operacao: 'Retira',
      fornecedor: '',
      local: '',
      endereco: '',
      num_cacamba: '',
      tipo_cacamba: 'Indústria',
      hora_prevista: '08:00',
      observacao: '',
    });
    carregar();
  }

  async function atualizarStatus(id: string, campos: any) {
    await supabase.from('ordens').update(campos).eq('id', id);
    setFotos({});
    carregar();
  }

  const placas = [...new Set(ordens.map((o: any) => o.placa))];
  const minhasOrdens = ordens.filter((o: any) => o.placa === placaSel);
  const inp = {
    width: '100%',
    padding: '7px 10px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    marginTop: '3px',
    boxSizing: 'border-box' as const,
  };
  const lbl = {
    fontSize: '11px',
    color: '#666',
    display: 'block',
    marginTop: '8px',
  };
  const btn = (cor = '#D85A30') => ({
    background: cor,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500 as const,
  });

  return (
    <div
      style={{
        fontFamily: 'system-ui,sans-serif',
        padding: '1rem',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #eee',
          paddingBottom: '1rem',
        }}
      >
        <span style={{ fontSize: '24px' }}>🚛</span>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#D85A30' }}>
            RFR Logística
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Controle de coletas
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', alignItems: 'center' }}>
        <button
          onClick={() => setTela('motorista')}
          style={{
            ...btn(tela === 'motorista' ? '#D85A30' : '#f5f5f5'),
            color: tela === 'motorista' ? '#fff' : '#444',
          }}
        >
          🚛 App Motorista
        </button>
        {!senhaOk ? (
          <button
            onClick={() => {
              const s = prompt('Senha do gestor:');
              if (s === '1234') {
                setSenhaOk(true);
                setTela('prog');
              } else if (s !== null) {
                alert('Senha incorreta!');
              }
            }}
            style={{ ...btn('#f5f5f5'), color: '#444' }}
          >
            🔒 Gestor
          </button>
        ) : (
          <>
            <button
              onClick={() => setTela('prog')}
              style={{
                ...btn(tela === 'prog' ? '#D85A30' : '#f5f5f5'),
                color: tela === 'prog' ? '#fff' : '#444',
              }}
            >
              📋 Programação
            </button>
            <button
              onClick={() => setTela('painel')}
              style={{
                ...btn(tela === 'painel' ? '#D85A30' : '#f5f5f5'),
                color: tela === 'painel' ? '#fff' : '#444',
              }}
            >
              📊 Painel ao vivo
            </button>
            <button
              onClick={() => setTela('rastreamento')}
              style={{
                ...btn(tela === 'rastreamento' ? '#D85A30' : '#f5f5f5'),
                color: tela === 'rastreamento' ? '#fff' : '#444',
              }}
            >
              📍 Rastreamento
            </button>
            <button
              onClick={() => { setSenhaOk(false); setTela('motorista'); }}
              style={{ ...btn('#aaa') }}
            >
              🔓 Sair
            </button>
          </>
        )}
      </div>

      {tela === 'prog' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: 500 }}>
              Programação —{' '}
              {new Date().toLocaleDateString('pt-BR', {
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btn('#1a7a3c')} onClick={exportarCSV}>
                📊 Exportar CSV
              </button>
              <button style={btn()} onClick={() => setShowForm(!showForm)}>
                + Nova ordem
              </button>
            </div>
          </div>
          {showForm && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #F0997B',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                Nova ordem de coleta
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                <div>
                  <label style={lbl}>Placa</label>
                  <input
                    style={inp}
                    value={form.placa}
                    onChange={(e) => {
                      const p = e.target.value.toUpperCase();
                      setForm({
                        ...form,
                        placa: p,
                        motorista: MOTORISTAS[p] || form.motorista,
                      });
                    }}
                    placeholder="FOD2B51"
                  />
                </div>
                <div>
                  <label style={lbl}>Motorista</label>
                  <input
                    style={inp}
                    value={form.motorista}
                    onChange={(e) =>
                      setForm({ ...form, motorista: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={lbl}>Operação</label>
                  <select
                    style={inp}
                    value={form.operacao}
                    onChange={(e) =>
                      setForm({ ...form, operacao: e.target.value })
                    }
                  >
                    {['Retira', 'Entrega', 'Troca', 'Carrega na hora'].map(
                      (o) => (
                        <option key={o}>{o}</option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tipo veículo</label>
                  <select
                    style={inp}
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  >
                    {['Caminhão comum', 'ROLLON', 'POLY/DUPLO', 'MUNCK', 'MUNCK + TROCA', 'JULIETA', 'POLLY DUPLO'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Fornecedor</label>
                  <input
                    style={inp}
                    value={form.fornecedor}
                    onChange={(e) => {
                      const nome = e.target.value.toUpperCase();
                      const encontrado = ordens.find(
                        (o: any) =>
                          o.fornecedor?.toUpperCase() === nome && o.endereco
                      );
                      setForm({
                        ...form,
                        fornecedor: nome,
                        endereco: encontrado ? encontrado.endereco : form.endereco,
                      });
                    }}
                    placeholder="GRIMALDI"
                  />
                </div>
                <div>
                  <label style={lbl}>Local</label>
                  <input
                    style={inp}
                    value={form.local}
                    onChange={(e) =>
                      setForm({ ...form, local: e.target.value })
                    }
                    placeholder="SANTO ANTONIO"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Endereço completo</label>
                  <input
                    style={inp}
                    value={form.endereco}
                    onChange={(e) =>
                      setForm({ ...form, endereco: e.target.value })
                    }
                    placeholder="Rua Example, 123 - Bairro - Cidade"
                  />
                </div>
                <div>
                  <label style={lbl}>Nº caçamba</label>
                  <input
                    style={inp}
                    value={form.num_cacamba}
                    onChange={(e) =>
                      setForm({ ...form, num_cacamba: e.target.value })
                    }
                    placeholder="110"
                  />
                </div>
                <div>
                  <label style={lbl}>Tipo caçamba</label>
                  <select
                    style={inp}
                    value={form.tipo_cacamba}
                    onChange={(e) =>
                      setForm({ ...form, tipo_cacamba: e.target.value })
                    }
                  >
                    {['Indústria', 'Plataforma', 'Sucateiro', 'Polly', '—'].map(
                      (o) => (
                        <option key={o}>{o}</option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Horário previsto</label>
                  <input
                    style={inp}
                    type="time"
                    value={form.hora_prevista}
                    onChange={(e) =>
                      setForm({ ...form, hora_prevista: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={lbl}>Observação</label>
                  <input
                    style={inp}
                    value={form.observacao}
                    onChange={(e) =>
                      setForm({ ...form, observacao: e.target.value })
                    }
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                <button style={btn()} onClick={salvarOrdem}>
                  ✅ Salvar ordem
                </button>
                <button style={btn('#aaa')} onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {ordens.length === 0 ? (
            <div
              style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}
            >
              Nenhuma ordem cadastrada hoje.
            </div>
          ) : (
            placas.map((placa) => {
              const g = ordens.filter((o: any) => o.placa === placa);
              return (
                <div
                  key={placa}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: '#FAECE7',
                        color: '#993C1D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {g[0]?.motorista?.slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{g[0]?.motorista}</div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#888',
                          fontFamily: 'monospace',
                        }}
                      >
                        {placa}
                      </div>
                    </div>
                  </div>
                  {g.map((o: any) => (
                    <div
                      key={o.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr .7fr .7fr 1fr',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '8px',
                        background: '#fafafa',
                        borderRadius: '8px',
                        marginBottom: '4px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{o.fornecedor}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          {o.local}
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#FAECE7',
                          color: TIPO_BADGE[o.operacao] || '#333',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontWeight: 500,
                        }}
                      >
                        {o.operacao}
                      </span>
                      <div style={{ fontFamily: 'monospace' }}>
                        {o.num_cacamba || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {o.hora_prevista || '—'}
                      </div>
                      <span
                        style={{
                          background: '#f5f5f5',
                          color: STATUS_COR[o.status] || '#888',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontWeight: 500,
                        }}
                      >
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {tela === 'painel' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: '10px',
              marginBottom: '1.5rem',
            }}
          >
            {[
              { l: 'Ordens hoje', v: ordens.length, c: '#333' },
              {
                l: 'Em rota',
                v: ordens.filter((o: any) => o.status === 'em rota').length,
                c: '#D85A30',
              },
              {
                l: 'Check-in feito',
                v: ordens.filter((o: any) => o.status === 'check-in').length,
                c: '#0F6E56',
              },
              {
                l: 'Concluídas',
                v: ordens.filter((o: any) => o.status === 'concluído').length,
                c: '#1a7a3c',
              },
            ].map((m) => (
              <div
                key={m.l}
                style={{
                  background: '#f9f9f9',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '4px',
                  }}
                >
                  {m.l}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: m.c }}>
                  {m.v}
                </div>
              </div>
            ))}
          </div>
          {placas.map((placa) => {
            const g = ordens.filter((o: any) => o.placa === placa);
            return (
              <div
                key={placa}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '.75rem',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#FAECE7',
                      color: '#993C1D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {g[0]?.motorista?.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{g[0]?.motorista}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888',
                        fontFamily: 'monospace',
                      }}
                    >
                      {placa}
                    </div>
                  </div>
                </div>
                {g.map((o: any) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr .8fr .8fr .8fr .6fr',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '8px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{o.fornecedor}</div>
                      <div style={{ color: '#888', fontSize: '11px' }}>
                        {o.local}
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#f0f0f0',
                        color: STATUS_COR[o.status],
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontWeight: 500,
                      }}
                    >
                      {o.status}
                    </span>
                    <div>
                      <div style={{ color: '#aaa', fontSize: '10px' }}>
                        Saída
                      </div>
                      {o.hora_saida ? formatHora(o.hora_saida) : '—'}
                    </div>
                    <div>
                      <div style={{ color: '#aaa', fontSize: '10px' }}>
                        Check-in
                      </div>
                      {o.hora_checkin ? formatHora(o.hora_checkin) : '—'}
                    </div>
                    <div>
                      <div style={{ color: '#aaa', fontSize: '10px' }}>
                        Retorno
                      </div>
                      {o.hora_retorno ? formatHora(o.hora_retorno) : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {[
                        o.url_foto_ida,
                        o.url_foto_fachada,
                        o.url_foto_volta,
                      ].map((url: any, i: number) =>
                        url ? (
                          <a key={i} href={url} target="_blank">
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '4px',
                                background: '#FAECE7',
                                border: '1px solid #F0997B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                              }}
                            >
                              📷
                            </div>
                          </a>
                        ) : (
                          <div
                            key={i}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '4px',
                              background: '#f0f0f0',
                              border: '1px solid #ddd',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              color: '#ccc',
                            }}
                          >
                            ·
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tela === 'motorista' && (
        <div style={{ maxWidth: '380px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={lbl}>Selecione sua placa</label>
            <select
              style={inp}
              value={placaSel}
              onChange={(e) => setPlacaSel(e.target.value)}
            >
              <option value="">— selecione —</option>
              {placas.map((p) => (
                <option key={p} value={p}>
                  {p} — {ordens.find((o: any) => o.placa === p)?.motorista}
                </option>
              ))}
            </select>
          </div>
          {minhasOrdens.map((o: any, i: number) => (
            <div
              key={o.id}
              style={{
                background: '#fff',
                border: `1px solid ${STATUS_COR[o.status] || '#ddd'}`,
                borderLeft: `4px solid ${STATUS_COR[o.status] || '#ddd'}`,
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#aaa',
                  textTransform: 'uppercase',
                }}
              >
                Ordem {i + 1}
              </div>
              <div
                style={{ fontWeight: 600, fontSize: '15px', margin: '4px 0' }}
              >
                {o.fornecedor}
              </div>
              <div
                style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}
              >
                {o.local}
              </div>
              <div style={{ marginBottom: '10px' }}>
                {o.endereco ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.endereco)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f0f7ff',
                      border: '1px solid #b3d4f5',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#1a6fbd',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <span>{o.endereco}</span>
                  </a>
                ) : (
                  <div
                    style={{
                      background: '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#aaa',
                    }}
                  >
                    📍 Não há localização
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap' as const,
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    background: '#FAECE7',
                    color: '#993C1D',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}
                >
                  {o.operacao}
                </span>
                <span
                  style={{
                    background: '#f5f5f5',
                    color: '#666',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}
                >
                  {o.tipo_cacamba}
                </span>
                {o.num_cacamba && (
                  <span
                    style={{
                      background: '#f5f5f5',
                      color: '#666',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    Caç. {o.num_cacamba}
                  </span>
                )}
              </div>
              {!o.hora_saida && (
                <div>
                  <FotoBtn
                    label="Foto da caçamba (saída)"
                    onFoto={(url) =>
                      setFotos((f: any) => ({ ...f, [o.id + '_ida']: url }))
                    }
                  />
                  <button
                    style={{ ...btn(), width: '100%' }}
                    onClick={() =>
                      atualizarStatus(o.id, {
                        status: 'em rota',
                        hora_saida: new Date().toISOString(),
                        foto_ida: true,
                        url_foto_ida: fotos[o.id + '_ida'] || null,
                      })
                    }
                  >
                    🚛 Confirmar saída
                  </button>
                </div>
              )}
              {o.hora_saida && !o.hora_checkin && (
                <div>
                  <FotoBtn
                    label="Foto da fachada do fornecedor"
                    onFoto={(url) =>
                      setFotos((f: any) => ({ ...f, [o.id + '_fachada']: url }))
                    }
                  />
                  <button
                    style={{ ...btn('#0F6E56'), width: '100%' }}
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          atualizarStatus(o.id, {
                            status: 'check-in',
                            hora_checkin: new Date().toISOString(),
                            foto_fachada: true,
                            url_foto_fachada: fotos[o.id + '_fachada'] || null,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                          });
                        },
                        () => {
                          atualizarStatus(o.id, {
                            status: 'check-in',
                            hora_checkin: new Date().toISOString(),
                            foto_fachada: true,
                            url_foto_fachada: fotos[o.id + '_fachada'] || null,
                          });
                        }
                      );
                    }}
                  >
                    ✅ Check-in no fornecedor
                  </button>
                </div>
              )}
              {o.hora_checkin && !o.hora_checkout && (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Nº caçamba que está retornando
                    </label>
                    <input
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '13px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box' as const,
                      }}
                      placeholder="Ex: 49"
                      value={fotos[o.id + '_cacamba_retorno'] || ''}
                      onChange={(e) =>
                        setFotos((f: any) => ({ ...f, [o.id + '_cacamba_retorno']: e.target.value }))
                      }
                    />
                  </div>
                  <FotoBtn
                    label="Foto da caçamba (retorno)"
                    onFoto={(url) =>
                      setFotos((f: any) => ({ ...f, [o.id + '_volta']: url }))
                    }
                  />
                  <button
                    style={{ ...btn('#854F0B'), width: '100%' }}
                    onClick={() =>
                      atualizarStatus(o.id, {
                        status: 'retornando',
                        hora_checkout: new Date().toISOString(),
                        foto_volta: true,
                        url_foto_volta: fotos[o.id + '_volta'] || null,
                        num_cacamba_retorno: fotos[o.id + '_cacamba_retorno'] || null,
                      })
                    }
                  >
                    🚩 Check-out
                  </button>
                </div>
              )}
              {o.hora_checkout && !o.hora_retorno && (
                <button
                  style={{ ...btn('#444'), width: '100%' }}
                  onClick={() =>
                    atualizarStatus(o.id, {
                      status: 'concluído',
                      hora_retorno: new Date().toISOString(),
                    })
                  }
                >
                  🏠 Chegada no pátio
                </button>
              )}
              {o.hora_retorno && (
                <div
                  style={{
                    background: '#e8f5e9',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#1a7a3c',
                  }}
                >
                  ✅ Finalizada às {formatHora(o.hora_retorno)}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {[
                  { l: 'Saída', v: o.hora_saida },
                  { l: 'Check-in', v: o.hora_checkin },
                  { l: 'Retorno', v: o.hora_retorno },
                ].map((h) => (
                  <div
                    key={h.l}
                    style={{
                      flex: 1,
                      background: '#fafafa',
                      borderRadius: '6px',
                      padding: '6px',
                      textAlign: 'center' as const,
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#aaa' }}>{h.l}</div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#444',
                      }}
                    >
                      {h.v ? formatHora(h.v) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tela === 'rastreamento' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap' as const }}>
            <div style={{ fontWeight: 500 }}>📍 Rastreamento de Caçambas</div>
            <input
              type="date"
              value={filtroDt}
              onChange={(e) => setFiltroDt(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
            />
          </div>

          {/* LINKS DO MAPS */}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px', marginBottom: '1rem' }}>
            {ordens
              .filter((o: any) => o.lat && o.lng && o.hora_checkin && !o.hora_retorno)
              .map((o: any) => (
                <a
                  key={o.id}
                  href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f0f7ff',
                    border: '1px solid #b3d4f5',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#1a6fbd',
                    textDecoration: 'none',
                  }}
                >
                  📍 Caç. #{o.num_cacamba} — {o.fornecedor}
                </a>
              ))}
            {ordens.filter((o: any) => o.lat && o.lng && o.hora_checkin && !o.hora_retorno).length === 0 && (
              <div style={{ fontSize: '12px', color: '#aaa' }}>Nenhuma caçamba com localização GPS registrada ainda.</div>
            )}
          </div>

          {/* RELATÓRIO */}
          <div style={{ fontWeight: 500, marginBottom: '8px', fontSize: '13px', color: '#666' }}>
            Caçambas — {new Date(filtroDt + 'T12:00:00').toLocaleDateString('pt-BR')}
          </div>
          {ordens
            .filter((o: any) => {
              const dt = o.hora_checkin ? o.hora_checkin.slice(0, 10) : o.criado_em?.slice(0, 10);
              return dt === filtroDt && o.num_cacamba;
            })
            .map((o: any) => {
              const checkinDt = o.hora_checkin ? new Date(o.hora_checkin) : null;
              const agora = new Date();
              const diffH = checkinDt ? Math.floor((agora.getTime() - checkinDt.getTime()) / 3600000) : null;
              const emCampo = o.hora_checkin && !o.hora_retorno;
              return (
                <div
                  key={o.id}
                  style={{
                    background: '#fff',
                    border: `1px solid ${emCampo ? '#F0997B' : '#e5e5e5'}`,
                    borderLeft: `4px solid ${emCampo ? '#D85A30' : '#1a7a3c'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '8px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: '8px',
                    alignItems: 'center',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Caçamba deixada</div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#D85A30' }}>#{o.num_cacamba || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Caçamba retornada</div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a7a3c' }}>#{o.num_cacamba_retorno || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Fornecedor</div>
                    <div style={{ fontWeight: 500 }}>{o.fornecedor}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{o.local}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Motorista</div>
                    <div style={{ fontWeight: 500 }}>{o.motorista}</div>
                    <div style={{ fontSize: '11px', color: emCampo ? '#D85A30' : '#1a7a3c' }}>
                      {emCampo ? `🕐 ${diffH}h em campo` : '✅ Retornou'}
                    </div>
                  </div>
                </div>
              );
            })}
          {ordens.filter((o: any) => {
            const dt = o.hora_checkin ? o.hora_checkin.slice(0, 10) : o.criado_em?.slice(0, 10);
            return dt === filtroDt && o.num_cacamba;
          }).length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
              Nenhuma caçamba registrada nesta data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
