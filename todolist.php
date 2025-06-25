<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
$host = 'localhost';
$db   = 'onlyengs';
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
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Lister toutes les tâches
        $stmt = $pdo->query("SELECT * FROM tasks ORDER BY id DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        // Ajouter une tâche
        $data = json_decode(file_get_contents('php://input'), true);
        // Correction du nom de champ JS -> PHP
        if (isset($data['dueDate'])) $data['due_date'] = $data['dueDate'];
        $stmt = $pdo->prepare("INSERT INTO tasks (title, description, category, priority, progress, due_date, assignees, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['title'],
            $data['description'],
            $data['category'],
            $data['priority'],
            $data['progress'],
            $data['due_date'],
            $data['assignees'],
            $data['status']
        ]);
        echo json_encode(['id' => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        // Modifier une tâche
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['dueDate'])) $data['due_date'] = $data['dueDate'];
        $stmt = $pdo->prepare("UPDATE tasks SET title=?, description=?, category=?, priority=?, progress=?, due_date=?, assignees=?, status=? WHERE id=?");
        $stmt->execute([
            $data['title'],
            $data['description'],
            $data['category'],
            $data['priority'],
            $data['progress'],
            $data['due_date'],
            $data['assignees'],
            $data['status'],
            $data['id']
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        // Supprimer une tâche
        $id = $_GET['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        break;
}
?>