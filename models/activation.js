import email from "infra/email";

async function sendEmailToUser(user) {
  await email.send({
    from: "DJ <email@djonathan.com>",
    to: `<${user.email}>`,
    subject: "Activate your account",
    text: `${user.username}, click the link below to activate your account: http://localhost:3000/api/v1/users/${user.username}/activate`,
  });
}

const activation = {
  sendEmailToUser,
};

export default activation;
