from app.models.farmer import Farmer


def test_farmer_model_has_password_hash():
    farmer = Farmer(
        phone="+919479669839",
        name="Ramesh Kumar",
        password_hash="pbkdf2_sha256$100000$test$test",
    )
    assert farmer.password_hash == "pbkdf2_sha256$100000$test$test"


def test_farmer_model_allows_null_password_hash():
    farmer = Farmer(
        phone="+919479669839",
        name="Walkin Farmer",
        password_hash=None,
    )
    assert farmer.password_hash is None
