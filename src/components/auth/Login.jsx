// src/pages/auth/Login.jsx (o donde lo tengas)
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import { Button, Input, Form, Typography, message, Divider } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { login as loginService, loginWithGoogle } from "../../services/auth/authService";
import { GoogleLogin } from "@react-oauth/google";
const { Title, Text, Link } = Typography;
const PRIMARY_COLOR = "#0a1f3d";

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

  const onGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      const response = await loginWithGoogle(credentialResponse.credential);
      if (response.token) {
        contextLogin(response.token, response.user);
        message.success(response.message || "¡Inicio de sesión con Google exitoso!", 2);
        navigate("/inicio");
      } else {
        throw new Error("No se recibió token del servidor");
      }
    } catch (error) {
      console.error(error);
      const backendMessage =
        error.response?.data?.error || "Error al iniciar sesión con Google.";
      message.error(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleError = () => {
    message.error("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <header className="mb-8 text-center">
          <Title level={2} className="!mt-0 !mb-2">
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
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0a1f3d 100%)', border: 'none' }}
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

        <Divider plain>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            o continúa con
          </Text>
        </Divider>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={onGoogleError}
            useOneTap={false}
            locale="es"
            text="signin_with"
            shape="rectangular"
            theme="outline"
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
