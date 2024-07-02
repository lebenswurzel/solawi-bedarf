/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

<?php
set_error_handler(/**
 * @throws Exception
 */ function() {
    /* ignore errors */
    throw new Exception("Das war ganz böse :-(");
});
if ($_SERVER["REQUEST_URI"] == '/' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $json = file_get_contents('php://input');
        $data = json_decode($json);
        $result = password_verify($data->password, $data->hash);
        $response = json_encode(['verify' => $result]);
        header('Content-Type: application/json');
        echo $response;
    } catch (Exception|Error|Throwable $e) {
        echo "<p>Hallo unbekannter Fehler :-)</p>";
    }
} else {
    echo "<p>Willkommen :-)</p>";
}
