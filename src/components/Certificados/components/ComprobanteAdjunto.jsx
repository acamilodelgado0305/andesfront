import React, { useEffect, useMemo } from 'react';
import { Upload, Button, Tooltip, message } from 'antd';
import {
    PaperClipOutlined, FilePdfOutlined, EyeOutlined, SwapOutlined, DeleteOutlined,
} from '@ant-design/icons';
import useIsMobile from '../../../hooks/useIsMobile';
import { useTheme } from '../../../ThemeContext';

// Lo mismo que acepta el BACKEND (middleware/uploadComprobante.js)
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ACCEPT = TIPOS.join(',');
const MAX_MB = 10;

const esImagenUrl = (url) => /\.(jpe?g|png|webp|gif)$/i.test((url || '').split('?')[0]);

const pesoLegible = (bytes) => (bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Documento soporte (PDF o imagen) de un ingreso o egreso.
 *
 * Controlado por el drawer: `archivo` es el File recién elegido (aún sin subir)
 * y `url` el que ya estaba guardado. El archivo se sube al guardar el
 * movimiento, con `sincronizarComprobante`.
 */
const ComprobanteAdjunto = ({ archivo, url, onArchivo, onQuitar }) => {
    const isMobile = useIsMobile();
    const { isDark } = useTheme();

    // Vista previa del archivo local antes de subirlo
    const urlLocal = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
    useEffect(() => () => { if (urlLocal) URL.revokeObjectURL(urlLocal); }, [urlLocal]);

    // Se valida aquí para avisar de una vez; `false` evita que antd lo suba por su cuenta.
    const elegir = (file) => {
        if (!TIPOS.includes(file.type)) {
            message.error('Solo se aceptan archivos PDF o imágenes (JPG, PNG o WEBP)');
        } else if (file.size > MAX_MB * 1024 * 1024) {
            message.error(`El archivo pasa de ${MAX_MB} MB`);
        } else {
            onArchivo(file);
        }
        return false;
    };

    const href = urlLocal || url;

    if (!href) {
        return (
            <Upload.Dragger accept={ACCEPT} showUploadList={false} beforeUpload={elegir}>
                <p className="ant-upload-drag-icon" style={{ marginBottom: 6 }}>
                    <PaperClipOutlined style={{ fontSize: 26, color: isDark ? '#5eead4' : '#155153' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 14 }}>
                    {isMobile ? 'Toca para adjuntar un documento' : 'Haz clic o arrastra el documento aquí'}
                </p>
                <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                    PDF o imagen (factura, recibo, comprobante) · máx. {MAX_MB} MB
                </p>
            </Upload.Dragger>
        );
    }

    const esImagen = archivo ? archivo.type.startsWith('image/') : esImagenUrl(url);
    const nombre   = archivo ? archivo.name : (esImagen ? 'Imagen adjunta' : 'Documento PDF');
    const detalle  = archivo ? `${pesoLegible(archivo.size)} · se sube al guardar` : 'Adjunto guardado';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 10,
            border: '1px solid var(--qc-border)', borderRadius: 8, background: 'var(--qc-surface-2)',
        }}>
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                {esImagen ? (
                    <img
                        src={href}
                        alt=""
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                    />
                ) : (
                    <div style={{
                        width: 48, height: 48, borderRadius: 6, background: 'rgba(220,38,38,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <FilePdfOutlined style={{ fontSize: 24, color: '#dc2626' }} />
                    </div>
                )}
            </a>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 600, fontSize: 13, color: 'var(--qc-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {nombre}
                </div>
                <div style={{ fontSize: 12, color: 'var(--qc-text-muted)' }}>{detalle}</div>
            </div>

            <Tooltip title="Ver">
                <Button type="text" size="small" icon={<EyeOutlined />} href={href} target="_blank" rel="noopener noreferrer" />
            </Tooltip>
            <Upload accept={ACCEPT} showUploadList={false} beforeUpload={elegir}>
                <Tooltip title="Cambiar">
                    <Button type="text" size="small" icon={<SwapOutlined />} />
                </Tooltip>
            </Upload>
            <Tooltip title="Quitar">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onQuitar} />
            </Tooltip>
        </div>
    );
};

/**
 * Sube el archivo nuevo o quita el que había, según cómo quedó el formulario.
 * Se llama DESPUÉS de guardar el movimiento (necesita su id). Devuelve null si
 * salió bien, o el motivo en minúscula para completar
 * "El gasto se guardó, pero …" (el movimiento ya quedó guardado igual).
 */
export const sincronizarComprobante = async ({ id, archivo, url, urlInicial, subir, quitar }) => {
    const quitando = !archivo && !!urlInicial && !url;
    if (!archivo && !quitando) return null;
    try {
        if (archivo) await subir(id, archivo);
        else await quitar(id);
        return null;
    } catch (err) {
        const motivo = err.response?.data?.message || err.message;
        return `no se pudo ${archivo ? 'subir' : 'quitar'} el documento${motivo ? ` (${motivo})` : ''}.`;
    }
};

export default ComprobanteAdjunto;
