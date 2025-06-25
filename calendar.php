<?php
header('Content-Type: application/json');

// Paramètres de connexion
$host = 'localhost';
$db = 'onlyengs';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Erreur de connexion à la base de données : " . $e->getMessage()]);
    exit;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM events");
        $events = $stmt->fetchAll();
        foreach ($events as &$row) {
            $row['reminder'] = (bool)$row['reminder'];
        }
        echo json_encode($events);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO events (title, type, start, end, description, link, location, color, reminder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['title'],
            $data['type'],
            $data['start'],
            $data['end'],
            $data['description'],
            $data['link'],
            $data['location'],
            $data['color'],
            $data['reminder']
        ]);
        echo json_encode(['id' => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE events SET title=?, type=?, start=?, end=?, description=?, link=?, location=?, color=?, reminder=? WHERE id=?");
        $stmt->execute([
            $data['title'],
            $data['type'],
            $data['start'],
            $data['end'],
            $data['description'],
            $data['link'],
            $data['location'],
            $data['color'],
            $data['reminder'],
            $data['id']
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        parse_str(file_get_contents("php://input"), $data);
        $id = intval($data['id']);
        $stmt = $pdo->prepare("DELETE FROM events WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>