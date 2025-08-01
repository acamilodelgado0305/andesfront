import React, { useState } from 'react';
import { Modal, DatePicker, InputNumber, Button, message } from 'antd';
import moment from 'moment';

import { createSubscriptionApi } from '../../../services/adminService';

function AddSubscriptionModal({ visible, onCancel, clientId, onSuccess }) {
    const [startDate, setStartDate] = useState(moment()); // Valor inicial: fecha actual
    const [amountPaid, setAmountPaid] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({ startDate: '', amountPaid: '' });

    // Deshabilita fechas futuras
    const disabledDate = (current) => {
        return current && current > moment().endOf('day');
    };

    const handleDateChange = (date) => {
        setStartDate(date);
        setErrors((prev) => ({ ...prev, startDate: date ? '' : 'Por favor seleccione la fecha de inicio.' }));
    };

    const handleAmountChange = (value) => {
        setAmountPaid(value);
        setErrors((prev) => ({ ...prev, amountPaid: value ? '' : 'Por favor ingrese el monto.' }));
    };

    const handleSubmit = async () => {
        // Validaciones manuales
        if (!startDate) {
            setErrors((prev) => ({ ...prev, startDate: 'Por favor seleccione la fecha de inicio.' }));
            return;
        }
        if (!amountPaid) {
            setErrors((prev) => ({ ...prev, amountPaid: 'Por favor ingrese el monto.' }));
            return;
        }

        setLoading(true);
        const payload = {
            userId: clientId,
            startDate: startDate.format('YYYY-MM-DD'),
            amountPaid,
        };
        try {
            await createSubscriptionApi(payload);
            message.success('Suscripción creada exitosamente!');
            onSuccess();
            // Reiniciar estados
            setStartDate(moment());
            setAmountPaid(null);
            setErrors({ startDate: '', amountPaid: '' });
        } catch (error) {
            message.error('Error al crear la suscripción.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        // Reiniciar estados al cerrar
        setStartDate(moment());
        setAmountPaid(null);
        setErrors({ startDate: '', amountPaid: '' });
        onCancel();
    };

    return (
        <Modal
            title="Añadir Nueva Suscripción"
            open={visible}
            onCancel={handleCancel}
            destroyOnClose
            footer={null}
        >
            <div className="mb-4">
                <label className="block mb-1 font-medium">Fecha de Inicio</label>
                <DatePicker className="w-full h-10" format="YYYY-MM-DD" />
                {errors.startDate && <div className="text-red-500 text-sm mt-1">{errors.startDate}</div>}
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">Monto Pagado (COP)</label>
                <InputNumber
                    value={amountPaid}
                    onChange={handleAmountChange}
                    className="w-full"
                    formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                />
                {errors.amountPaid && <div className="text-red-500 text-sm mt-1">{errors.amountPaid}</div>}
            </div>

            <Button
                size="large"
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            >
                Enviar Registro
            </Button>
        </Modal>
    );
}

export default AddSubscriptionModal;