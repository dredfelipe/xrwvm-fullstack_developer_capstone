import React, { useState } from "react";
import Header from "../Header/Header";
import "./Register.css";

const Register = () => {
  const [form, setForm] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const register = async (event) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/djangoapp/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message || "Registration failed.");
      return;
    }
    sessionStorage.setItem("username", payload.userName);
    sessionStorage.setItem("firstname", payload.firstName);
    sessionStorage.setItem("lastname", payload.lastName);
    window.location.href = "/dealers";
  };

  return (
    <div>
      <Header />
      <main className="register_container">
        <h1 className="header">Create account</h1>
        <form className="inputs" onSubmit={register}>
          {[
            ["userName", "Username", "text"],
            ["firstName", "First Name", "text"],
            ["lastName", "Last Name", "text"],
            ["email", "Email", "email"],
            ["password", "Password", "password"],
          ].map(([name, label, type]) => (
            <label className="input" key={name}>
              <span>{label}</span>
              <input
                className="input_field"
                name={name}
                type={type}
                placeholder={label}
                value={form[name]}
                onChange={updateField}
                required
              />
            </label>
          ))}
          {error && <p className="register_error">{error}</p>}
          <div className="submit_panel">
            <button className="submit" type="submit">Register</button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Register;
