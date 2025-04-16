<?php
// 設定接收 Email
$to = "kmuh51040@gmail.com";

// 取得表單資料
$name = $_POST['name'] ?? '';
$relation = $_POST['relation'] ?? '';
$location = $_POST['location'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$fax = $_POST['fax'] ?? '';
$contact = isset($_POST['contact']) ? implode(", ", $_POST['contact']) : '';
$time = $_POST['time'] ?? '';

$type = isset($_POST['type']) ? implode(", ", $_POST['type']) : '';
$type_other = $_POST['type_other'] ?? '';

$birth = $_POST['birth'] ?? '';
$diagnosed = $_POST['diagnosed'] ?? '';
$level = $_POST['level'] ?? '';
$disabled_card = $_POST['disabled_card'] ?? '';
$critical_card = $_POST['critical_card'] ?? '';

$message = $_POST['message'] ?? '';

// Email 標題與內容
$subject = "【失智症諮詢表單】來自 $name";
$body = "
填表人姓名：$name
與失智者關係：$relation
居住地：$location

聯絡方式：$contact
聯絡時間：$time
Email：$email
電話：$phone

失智症種類：$type
其他類型補充：$type_other

--- 患者基本資料 ---
年齡：$birth
確定就診：$diagnosed
失智等級：$level
身心障礙手冊：$disabled_card
重大傷病卡：$critical_card

--- 問題主述 ---
$message
";

// 設定信件標頭
$headers = "From: $email\r\n" .
           "Reply-To: $email\r\n" .
           "Content-Type: text/plain; charset=UTF-8";

// 發送 Email
if (mail($to, $subject, $body, $headers)) {
  echo "<script>alert('已成功送出，感謝您的填寫！'); window.location.href='contact.html';</script>";
} else {
  echo "<script>alert('發送失敗，請稍後再試'); history.back();</script>";
}
?>