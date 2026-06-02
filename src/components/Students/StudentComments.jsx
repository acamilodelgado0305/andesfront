// src/components/Students/StudentComments.jsx
import React, { useEffect, useState } from 'react';
import {
  List,
  Input,
  Button,
  Avatar,
  Popconfirm,
  Empty,
  Spin,
  message,
  Space,
  Typography,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  getStudentComments,
  createStudentComment,
  updateStudentComment,
  deleteStudentComment,
} from '../../services/student/studentService';

const { TextArea } = Input;
const { Text } = Typography;

const formatFecha = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

function StudentComments({ studentId }) {
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTexto, setEditTexto] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  const fetchComments = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await getStudentComments(studentId);
      setComentarios(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error('No se pudieron cargar los comentarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const handleCrear = async () => {
    const texto = nuevo.trim();
    if (!texto) return;
    setEnviando(true);
    try {
      const creado = await createStudentComment(studentId, texto);
      setComentarios((prev) => [creado, ...prev]);
      setNuevo('');
      message.success('Comentario agregado.');
    } catch (err) {
      message.error('No se pudo agregar el comentario.');
    } finally {
      setEnviando(false);
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setEditTexto(c.comentario);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditTexto('');
  };

  const handleGuardarEdit = async (commentId) => {
    const texto = editTexto.trim();
    if (!texto) return;
    setGuardandoEdit(true);
    try {
      const actualizado = await updateStudentComment(studentId, commentId, texto);
      setComentarios((prev) =>
        prev.map((c) => (c.id === commentId ? actualizado : c))
      );
      cancelEdit();
      message.success('Comentario actualizado.');
    } catch (err) {
      message.error('No se pudo actualizar el comentario.');
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (commentId) => {
    setEliminandoId(commentId);
    try {
      await deleteStudentComment(studentId, commentId);
      setComentarios((prev) => prev.filter((c) => c.id !== commentId));
      message.success('Comentario eliminado.');
    } catch (err) {
      message.error('No se pudo eliminar el comentario.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <TextArea
          rows={3}
          placeholder="Escribe un comentario sobre el estudiante..."
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          maxLength={2000}
          showCount
        />
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleCrear}
            loading={enviando}
            disabled={!nuevo.trim()}
          >
            Agregar comentario
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : comentarios.length === 0 ? (
        <Empty description="Aún no hay comentarios" />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={comentarios}
          renderItem={(c) => (
            <List.Item
              key={c.id}
              actions={
                editId === c.id
                  ? []
                  : [
                      <Button
                        key="edit"
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startEdit(c)}
                      >
                        Editar
                      </Button>,
                      <Popconfirm
                        key="del"
                        title="¿Eliminar este comentario?"
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true, loading: eliminandoId === c.id }}
                        onConfirm={() => handleEliminar(c.id)}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          Eliminar
                        </Button>
                      </Popconfirm>,
                    ]
              }
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space size="small">
                    <Text strong>{c.autor_nombre || 'Usuario'}</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                      {formatFecha(c.created_at)}
                      {c.updated_at && c.updated_at !== c.created_at ? ' (editado)' : ''}
                    </Text>
                  </Space>
                }
              />
              {editId === c.id ? (
                <div>
                  <TextArea
                    rows={3}
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    maxLength={2000}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      size="small"
                      loading={guardandoEdit}
                      disabled={!editTexto.trim()}
                      onClick={() => handleGuardarEdit(c.id)}
                    >
                      Guardar
                    </Button>
                    <Button size="small" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  </Space>
                </div>
              ) : (
                <Text style={{ whiteSpace: 'pre-wrap' }}>{c.comentario}</Text>
              )}
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

export default StudentComments;
