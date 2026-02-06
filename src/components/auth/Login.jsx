// src/pages/auth/Login.jsx (o donde lo tengas)
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import { Button, Input, Form, Typography, message } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { login as loginService } from "../../services/auth/authService";
import logo from "../../../images/logo.png";

const { Title, Text, Link } = Typography;
const PRIMARY_COLOR = "#155153";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login: contextLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setIsLoading(true);
    try {
      const response = await loginService(values.email, values.password);
      // response = { token, user, message }

      if (response.token) {
        // Guardamos token + user en el contexto
        contextLogin(response.token, response.user);

        message.success(response.message || "¡Inicio de sesión exitoso!", 2);
        navigate("/inicio");
      } else {
        throw new Error(response.message || "Credenciales inválidas");
      }
    } catch (error) {
      console.error(error);
      const backendMessage =
        error.response?.data?.message || "Correo o contraseña incorrectos.";
      message.error(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <Title
              level={3}
              className="!mb-0"
              style={{ color: PRIMARY_COLOR, fontWeight: "600" }}
            >
              Controla
            </Title>
            <img
              src={logo}
              alt="Logo"
              className="h-7 w-7 object-contain"
            />
          </div>
          <Title level={2} className="!mt-2 !mb-2">
            Iniciar Sesión
          </Title>
          <Text type="secondary">
            Bienvenido de vuelta. ¡Nos alegra verte!
          </Text>
        </header>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="Correo Electrónico"
            rules={[
              {
                required: true,
                message: "Por favor, introduce tu correo electrónico.",
              },
              { type: "email", message: "El correo no es válido." },
            ]}
          >
            <Input
              prefix={<MailOutlined className="site-form-item-icon" />}
              placeholder="ejemplo@correo.com"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: "Por favor, introduce tu contraseña." },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="********"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Link
              href="#"
              style={{ float: "right", color: PRIMARY_COLOR }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
              style={{ background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
            >
              {isLoading ? "Iniciando..." : "Iniciar Sesión"}
            </Button>
          </Form.Item>

          <Text
            type="secondary"
            style={{ textAlign: "center", display: "block" }}
          >
            ¿No tienes una cuenta?
            <Link href="/registro" style={{ color: PRIMARY_COLOR }}>
              {" "}
              Regístrate ahora
            </Link>
          </Text>
        </Form>
      </div>
    </div>
  );
};

export default Login;
