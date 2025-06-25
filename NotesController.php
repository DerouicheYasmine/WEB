<?php
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
    echo "Erreur de connexion à la base de données : " . $e->getMessage();
    exit;
}

// ========== RÉCUPÉRER UNE NOTE PRÉCISE ==========
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    try {
        $stmt = $pdo->prepare("SELECT * FROM notes WHERE id_Notes = ?");
        $stmt->execute([$id]);
        $note = $stmt->fetch();
        header('Content-Type: application/json; charset=utf-8');
        if ($note) {
            echo json_encode($note);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Note non trouvée']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ========== SUPPRESSION ==========
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents("php://input"), $deleteVars);
    $id = isset($deleteVars['id']) ? (int)$deleteVars['id'] : null;

    header('Content-Type: text/plain; charset=utf-8');
    if ($id) {
        try {
            $stmt = $pdo->prepare("DELETE FROM notes WHERE id_Notes = ?");
            $stmt->execute([$id]);
            echo "🗑️ Note supprimée avec succès.";
        } catch (PDOException $e) {
            http_response_code(500);
            echo "❌ Erreur lors de la suppression : " . $e->getMessage();
        }
    } else {
        http_response_code(400);
        echo "❌ ID de la note manquant.";
    }
    exit;
}

// ========== AJOUT D'UNE NOUVELLE NOTE ==========
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['id'])) {
    $titre = trim($_POST['titre'] ?? '');
    $contenu = trim($_POST['contenu'] ?? '');
    $date = $_POST['date'] ?? '';

    header('Content-Type: text/plain; charset=utf-8');
    if ($titre !== '' && $contenu !== '' && $date !== '') {
        try {
            $stmt = $pdo->prepare("INSERT INTO notes (TitreNotes, ContenuNotes, DateNotes) VALUES (?, ?, ?)");
            $stmt->execute([$titre, $contenu, $date]);
            echo "✅ Note enregistrée avec succès.";
        } catch (PDOException $e) {
            http_response_code(500);
            echo "❌ Erreur lors de l'enregistrement : " . $e->getMessage();
        }
    } else {
        http_response_code(400);
        echo "❌ Tous les champs sont requis.";
    }
    exit;
}

// ========== MODIFICATION D'UNE NOTE EXISTANTE ==========
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    $id = (int) $_POST['id'];
    $titre = trim($_POST['titre'] ?? '');
    $contenu = trim($_POST['contenu'] ?? '');
    $date = $_POST['date'] ?? '';

    header('Content-Type: text/plain; charset=utf-8');
    if ($titre !== '' && $contenu !== '' && $date !== '') {
        try {
            // Vérifier si la note existe
            $stmt = $pdo->prepare("SELECT * FROM notes WHERE id_Notes = ?");
            $stmt->execute([$id]);
            $note = $stmt->fetch();

            if ($note) {
                // Mise à jour de la note
                $stmt = $pdo->prepare("UPDATE notes SET TitreNotes = ?, ContenuNotes = ?, DateNotes = ? WHERE id_Notes = ?");
                $stmt->execute([$titre, $contenu, $date, $id]);
                echo "✅ Note mise à jour avec succès.";
            } else {
                http_response_code(404);
                echo "❌ Note non trouvée.";
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo "❌ Erreur lors de la mise à jour : " . $e->getMessage();
        }
    } else {
        http_response_code(400);
        echo "❌ Tous les champs sont requis.";
    }
    exit;
}

// ========== AFFICHAGE DE TOUTES LES NOTES ==========
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: text/html; charset=utf-8');

    try {
        $stmt = $pdo->query("SELECT * FROM notes ORDER BY DateNotes DESC");
        $notes = $stmt->fetchAll();

        foreach ($notes as $note) {
            echo '<div class="border p-3 rounded bg-white shadow-sm mb-4">';
            echo '<h3 class="text-lg font-semibold text-blue-700">' . htmlspecialchars($note['TitreNotes']) . '</h3>';
            echo '<p class="text-sm text-gray-600 mb-2">' . htmlspecialchars($note['DateNotes']) . '</p>';
            echo '<p class="text-gray-800 whitespace-pre-wrap">' . nl2br(htmlspecialchars($note['ContenuNotes'])) . '</p>';
            echo '<button onclick="editNote(' . $note['id_Notes'] . ')" class="text-blue-500 hover:underline mr-2">✏️ Modifier</button>';
            echo '<button onclick="deleteNote(' . $note['id_Notes'] . ')" class="text-red-500 hover:underline">🗑️ Supprimer</button>';
            echo '</div>';
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo "❌ Erreur lors de la récupération des notes : " . $e->getMessage();
    }
    exit;
}
?>