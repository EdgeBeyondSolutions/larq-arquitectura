<?php
/**
 * Manejador del formulario de contacto — envía el mensaje por correo.
 * Requiere PHP con mail() habilitado (disponible por default en Hostinger).
 *
 * Destino de pruebas mientras se confirma el correo real del cliente:
 * contact@edgebeyond.solutions
 */

header('Content-Type: application/json; charset=utf-8');

// Solo aceptar POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errors' => [['message' => 'Método no permitido.']]]);
    exit;
}

// Honeypot anti-spam: campo oculto que un humano nunca llena.
if (!empty($_POST['_gotcha'])) {
    // Responde como si todo hubiera salido bien, sin enviar nada.
    echo json_encode(['ok' => true]);
    exit;
}

function clean_field($value) {
    $value = trim((string) $value);
    // Evita inyección de encabezados de correo (CRLF).
    return str_replace(["\r", "\n"], ' ', $value);
}

$name    = clean_field($_POST['name'] ?? '');
$email   = clean_field($_POST['email'] ?? '');
$phone   = clean_field($_POST['phone'] ?? '');
$message = trim((string) ($_POST['message'] ?? ''));
$subject = clean_field($_POST['_subject'] ?? 'Nuevo mensaje de contacto — Sitio LARQ');
$sitio   = clean_field($_POST['_sitio'] ?? 'larqad.com');

$errors = [];
if ($name === '') $errors[] = 'El nombre es obligatorio.';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'El correo electrónico no es válido.';
if ($message === '') $errors[] = 'El mensaje es obligatorio.';

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['errors' => array_map(fn($m) => ['message' => $m], $errors)]);
    exit;
}

// Correo de prueba mientras se confirma el destino real del cliente.
$to = 'contact@edgebeyond.solutions';

$body = "Nuevo mensaje desde el formulario de contacto de {$sitio}\n\n"
      . "Nombre: {$name}\n"
      . "Correo: {$email}\n"
      . "Teléfono: " . ($phone !== '' ? $phone : '(no proporcionado)') . "\n\n"
      . "Mensaje:\n{$message}\n";

// Remitente en el propio dominio (mejor entregabilidad); responder va al visitante.
$headers = [
    'From: LARQ Sitio Web <no-reply@larqad.com>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = @mail($to, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['errors' => [['message' => 'No se pudo enviar el mensaje. Intenta de nuevo o escríbenos por WhatsApp.']]]);
}
