import React, { useState, useEffect, useCallback } from 'react';
import {
  Input, Button, Spin, Empty, Avatar, Tooltip, Popconfirm, message,
} from 'antd';
import {
  SendOutlined, DeleteOutlined, CommentOutlined, MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import {
  getClaseComentarios, createClaseComentario, deleteClaseComentario,
} from '../../services/clases/serviceClase';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { TextArea } = Input;

// Color/etiqueta del autor según su rol, para distinguir staff de estudiantes.
const AUTOR_META = {
  admin: { color: '#155153', label: 'Admin' },
  docente: { color: '#2563eb', label: 'Docente' },
  estudiante: { color: '#7c3aed', label: 'Estudiante' },
};

// ¿El viewer puede borrar este comentario? Estudiante: solo los suyos.
// Admin/docente: cualquiera (el backend valida además que sea de su negocio).
const puedeBorrar = (viewer, c) => {
  if (!viewer) return false;
  if (viewer.tipo === 'admin' || viewer.tipo === 'docente') return true;
  return c.autor_tipo === 'estudiante' && Number(c.autor_id) === Number(viewer.id);
};

// Discusión (comentarios con respuestas) de una clase. Se renderiza en el panel
// derecho de la vista de clase. Todos los participantes de la clase ven y escriben.
export default function ClaseComentarios({ claseId }) {
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState([]);
  const [viewer, setViewer] = useState(null);

  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [replyTo, setReplyTo] = useState(null);      // id del comentario al que se responde
  const [replyText, setReplyText] = useState('');
  const [enviandoReply, setEnviandoReply] = useState(false);

  const [borrandoId, setBorrandoId] = useState(null);

  const fetchComentarios = useCallback(async () => {
    if (!claseId) return;
    setLoading(true);
    try {
      const data = await getClaseComentarios(claseId);
      setComentarios(data.comentarios || []);
      setViewer(data.viewer || null);
    } catch {
      // Silencioso: el panel muestra el estado vacío si falla la carga.
      setComentarios([]);
    } finally {
      setLoading(false);
    }
  }, [claseId]);

  useEffect(() => { fetchComentarios(); }, [fetchComentarios]);

  const handlePublicar = async () => {
    const contenido = nuevo.trim();
    if (!contenido) return;
    setEnviando(true);
    try {
      await createClaseComentario(claseId, { contenido });
      setNuevo('');
      await fetchComentarios();
    } catch (err) {
      message.error(err?.response?.data?.message || 'No se pudo publicar el comentario.');
    } finally {
      setEnviando(false);
    }
  };

  const handleResponder = async (parentId) => {
    const contenido = replyText.trim();
    if (!contenido) return;
    setEnviandoReply(true);
    try {
      await createClaseComentario(claseId, { contenido, parent_id: parentId });
      setReplyTo(null);
      setReplyText('');
      await fetchComentarios();
    } catch (err) {
      message.error(err?.response?.data?.message || 'No se pudo responder.');
    } finally {
      setEnviandoReply(false);
    }
  };

  const handleBorrar = async (id) => {
    setBorrandoId(id);
    try {
      await deleteClaseComentario(id);
      await fetchComentarios();
    } catch (err) {
      message.error(err?.response?.data?.message || 'No se pudo eliminar.');
    } finally {
      setBorrandoId(null);
    }
  };

  const totalComentarios = comentarios.reduce(
    (acc, c) => acc + 1 + (c.respuestas?.length || 0),
    0
  );

  const renderComentario = (c, esRespuesta = false) => {
    const meta = AUTOR_META[c.autor_tipo] || AUTOR_META.estudiante;
    const inicial = (c.autor_nombre || '?').charAt(0).toUpperCase();
    return (
      <div key={c.id} className={esRespuesta ? 'mt-3 pl-3 border-l-2 border-gray-100 dark:border-[#403e3a]' : ''}>
        <div className="flex items-start gap-2">
          <Avatar size={28} style={{ backgroundColor: meta.color, flexShrink: 0 }}>
            {inicial}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800 dark:text-[#faf9f5] truncate">
                {c.autor_nombre || 'Usuario'}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.label}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-[#a8a59e]">
                {c.created_at ? dayjs(c.created_at).fromNow() : ''}
              </span>
            </div>
            <p className="m-0 mt-0.5 text-sm text-gray-700 dark:text-[#e8e6df] whitespace-pre-line break-words">
              {c.contenido}
            </p>
            <div className="flex items-center gap-3 mt-1">
              {!esRespuesta && (
                <button
                  type="button"
                  onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }}
                  className="text-[11px] text-gray-500 dark:text-[#a8a59e] hover:text-purple-600 flex items-center gap-1"
                >
                  <MessageOutlined /> Responder
                </button>
              )}
              {puedeBorrar(viewer, c) && (
                <Popconfirm
                  title="¿Eliminar comentario?"
                  okText="Sí"
                  cancelText="No"
                  onConfirm={() => handleBorrar(c.id)}
                >
                  <button
                    type="button"
                    disabled={borrandoId === c.id}
                    className="text-[11px] text-gray-500 dark:text-[#a8a59e] hover:text-red-500 flex items-center gap-1"
                  >
                    <DeleteOutlined /> Eliminar
                  </button>
                </Popconfirm>
              )}
            </div>

            {/* Caja de respuesta */}
            {replyTo === c.id && (
              <div className="mt-2 flex items-end gap-2">
                <TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe una respuesta…"
                  maxLength={2000}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={enviandoReply}
                  disabled={!replyText.trim()}
                  onClick={() => handleResponder(c.id)}
                  style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                />
              </div>
            )}

            {/* Respuestas anidadas (un nivel) */}
            {c.respuestas?.map((r) => renderComentario(r, true))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] p-4 flex flex-col lg:max-h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-2 mb-3">
        <CommentOutlined style={{ color: '#7c3aed' }} />
        <span className="font-semibold text-gray-800 dark:text-[#faf9f5]">Comentarios</span>
        <span className="text-xs text-gray-400 dark:text-[#a8a59e]">({totalComentarios})</span>
      </div>

      {/* Lista de comentarios (scrollable) */}
      <div className="flex-1 overflow-auto pr-1 min-h-[80px]">
        {loading ? (
          <div className="flex justify-center py-6"><Spin /></div>
        ) : comentarios.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span className="text-xs text-gray-400 dark:text-[#a8a59e]">Sé el primero en comentar</span>}
          />
        ) : (
          <div className="space-y-4">
            {comentarios.map((c) => renderComentario(c))}
          </div>
        )}
      </div>

      {/* Composer del comentario principal */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#403e3a]">
        <TextArea
          autoSize={{ minRows: 2, maxRows: 5 }}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Escribe un comentario para esta clase…"
          maxLength={2000}
        />
        <div className="flex justify-end mt-2">
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={enviando}
            disabled={!nuevo.trim()}
            onClick={handlePublicar}
            style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
          >
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}
