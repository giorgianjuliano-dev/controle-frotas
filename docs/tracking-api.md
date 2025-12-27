# API de Rastreamento de Veículos

Este documento descreve como utilizar o endpoint de rastreamento para enviar dados de posição de veículos (GPS) para o sistema de controle de frotas.

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Autenticação](#2-autenticação)
3. [Endpoint](#3-endpoint)
4. [Exemplos de Uso](#4-exemplos-de-uso)
5. [Códigos de Resposta](#5-códigos-de-resposta)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Visão Geral

O endpoint de rastreamento permite que dispositivos GPS ou sistemas externos enviem dados de localização de veículos em tempo real. O sistema identifica o veículo pela placa e:

- **Se o veículo existir**: Atualiza a posição, velocidade e status
- **Se o veículo não existir**: Cria automaticamente um novo veículo com os dados recebidos

---

## 2. Autenticação

O endpoint utiliza autenticação via **API Key** no header da requisição.

### Configuração da API Key

1. Adicione a variável de ambiente `TRACKING_API_KEY` no arquivo `.env`:

```bash
TRACKING_API_KEY=sua-chave-secreta-aqui
```

2. Use a mesma chave no header `X-API-Key` das requisições.

> ⚠️ **IMPORTANTE**: Mantenha a API Key em segredo. Não compartilhe ou exponha em código público.

---

## 3. Endpoint

### POST /api/tracking

Envia dados de posição de um veículo.

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Content-Type` | string | Sim | Deve ser `application/json` |
| `X-API-Key` | string | Sim | Chave de autenticação da API |

#### Body (JSON)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `licensePlate` | string | Sim | Placa do veículo (ex: "ABC-1234") |
| `latitude` | number | Sim | Latitude (-90 a 90) |
| `longitude` | number | Sim | Longitude (-180 a 180) |
| `speed` | number | Sim | Velocidade em km/h (mínimo 0) |

#### Resposta de Sucesso (200)

```json
{
  "success": true,
  "message": "Posição atualizada com sucesso",
  "vehicle": {
    "id": "uuid-do-veiculo",
    "name": "Veículo ABC-1234",
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "currentSpeed": 65,
    "status": "moving",
    "ignition": "on",
    "lastUpdate": "2024-12-06T10:30:00.000Z"
  }
}
```

---

## 4. Exemplos de Uso

### cURL

```bash
curl -X POST http://localhost:5000/api/tracking \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave-secreta-aqui" \
  -d '{
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "speed": 65
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:5000/api/tracking', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sua-chave-secreta-aqui'
  },
  body: JSON.stringify({
    licensePlate: 'ABC-1234',
    latitude: -23.5489,
    longitude: -46.6388,
    speed: 65
  })
});

const data = await response.json();
console.log(data);
```

### Python (requests)

```python
import requests

url = 'http://localhost:5000/api/tracking'
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': 'sua-chave-secreta-aqui'
}
data = {
    'licensePlate': 'ABC-1234',
    'latitude': -23.5489,
    'longitude': -46.6388,
    'speed': 65
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

### PHP

```php
<?php
$url = 'http://localhost:5000/api/tracking';
$data = [
    'licensePlate' => 'ABC-1234',
    'latitude' => -23.5489,
    'longitude' => -46.6388,
    'speed' => 65
];

$options = [
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            'X-API-Key: sua-chave-secreta-aqui'
        ],
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
$result = json_decode($response, true);

print_r($result);
?>
```

---

## 5. Códigos de Resposta

| Código | Descrição | Exemplo de Resposta |
|--------|-----------|---------------------|
| **200** | Sucesso | `{ "success": true, "message": "Posição atualizada com sucesso", "vehicle": {...} }` |
| **400** | Dados inválidos | `{ "error": "Dados inválidos", "details": [...] }` |
| **401** | API Key inválida | `{ "error": "API Key inválida ou não fornecida" }` |
| **500** | Erro interno | `{ "error": "Falha ao processar dados de rastreamento" }` |

### Erros de Validação (400)

Se os dados enviados forem inválidos, a resposta incluirá detalhes sobre os erros:

```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Placa é obrigatória",
      "path": ["licensePlate"]
    }
  ]
}
```

---

## 6. Troubleshooting

### Erro: "API Key inválida ou não fornecida"

- Verifique se o header `X-API-Key` está sendo enviado corretamente
- Confirme que a chave corresponde ao valor em `TRACKING_API_KEY` no `.env`
- Certifique-se de que não há espaços extras na chave

### Erro: "API Key não configurada no servidor"

- A variável `TRACKING_API_KEY` não está definida no arquivo `.env`
- Reinicie o servidor após adicionar a variável

### Erro: "Dados inválidos"

- Verifique se todos os campos obrigatórios estão presentes
- Confirme que `latitude` está entre -90 e 90
- Confirme que `longitude` está entre -180 e 180
- Confirme que `speed` é um número >= 0
- Verifique se o `Content-Type` é `application/json`

### Veículo não aparece no mapa

1. Confirme que a requisição retornou status 200
2. Verifique se as coordenadas estão corretas (latitude/longitude não invertidos)
3. Atualize a página do dashboard
4. Verifique os logs do servidor para erros

---

## Comportamento do Sistema

### Status do Veículo

O status é definido automaticamente com base na velocidade:

- **speed > 0**: status = `moving`, ignition = `on`
- **speed = 0**: status = `stopped`, ignition mantém valor anterior (ou `off` para veículos novos)

### Criação Automática de Veículos

Quando um veículo com a placa informada não existe no sistema, ele é criado automaticamente com:

- **name**: "Veículo {placa}"
- **speedLimit**: 80 km/h (padrão)
- **heading**: 0
- **accuracy**: 5 metros

---

## Integração com Rastreadores

### Intervalo de Envio Recomendado

- **Em movimento**: 10-30 segundos
- **Parado**: 1-5 minutos

### Exemplo de Integração com Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "SUA_REDE_WIFI";
const char* password = "SUA_SENHA_WIFI";
const char* serverUrl = "http://seu-servidor:5000/api/tracking";
const char* apiKey = "sua-chave-secreta-aqui";
const char* licensePlate = "ABC-1234";

void sendPosition(float lat, float lng, float speed) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);

    StaticJsonDocument<200> doc;
    doc["licensePlate"] = licensePlate;
    doc["latitude"] = lat;
    doc["longitude"] = lng;
    doc["speed"] = speed;

    String json;
    serializeJson(doc, json);

    int httpCode = http.POST(json);
    if (httpCode == 200) {
      Serial.println("Posição enviada com sucesso!");
    } else {
      Serial.printf("Erro: %d\n", httpCode);
    }
    http.end();
  }
}
```

---

## Suporte

Em caso de dúvidas ou problemas, verifique:

1. Os logs do servidor para mensagens de erro detalhadas
2. A conectividade de rede entre o dispositivo e o servidor
3. Se a API Key está configurada corretamente em ambos os lados








