Below is a full specification of the recipe API backend.

GET / http.healthcheck.HealthCheckController.check()
GET /health http.healthcheck.HealthCheckController.check()

POST /signup http.authentication.AuthenticationController.signup()
POST /login http.authentication.AuthenticationController.login()
POST /logout http.authentication.AuthenticationController.logout()

POST /user/query http.users.UsersController.list()
GET /user/:id http.users.UsersController.get(id: java.util.UUID)
PUT /user/:id http.users.UsersController.put(id: java.util.UUID)
PUT /user/:id/avatar
{
**Headers:**

- `Authorization: Bearer <access_token>` - Required for authentication
- `Content-Type: image/jpeg` (or image/png, image/gif, etc.)

**Body:**

- Raw binary image data

**Response:**

```json
{
  "Body": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "countryOfOrigin": "USA",
    "avatarUrl": "http://localhost:8888/avatars/550e8400-e29b-41d4-a716-446655440000/avatar.jpeg",
    "createdOn": "2025-11-20T10:00:00Z",
    "updatedOn": "2025-11-20T12:30:00Z"
  }
}
```

}

DELETE /user/:id http.users.UsersController.delete(id: java.util.UUID)

POST /recipes/query http.recipes.RecipesController.list()
POST /recipes http.recipes.RecipesController.post()

GET /recipes/:id http.recipes.RecipesController.get(id: java.util.UUID)
PUT /recipes/:id http.recipes.RecipesController.put(id: java.util.UUID)
PUT /recipes/:id/image http.recipes.RecipesController.uploadImage(id: java.util.UUID)
DELETE /recipes/:id/image http.recipes.RecipesController.deleteImage(id: java.util.UUID)
POST /recipes/:id/instruction-image http.recipes.RecipesController.uploadInstructionImage(id: java.util.UUID)
POST /recipes/:id/save http.recipes.RecipesController.save(id: java.util.UUID)

POST /ingredients/query http.ingredients.IngredientsController.list()
POST /ingredients http.ingredients.IngredientsController.post()

GET /ingredients/:id http.ingredients.IngredientsController.get(id: java.util.UUID)
PUT /ingredients/:id http.ingredients.IngredientsController.put(id: java.util.UUID)
DELETE /ingredients/:id http.ingredients.IngredientsController.delete(id: java.util.UUID)

POST /tags/query http.tags.TagsController.list()

case class AvatarUrls(
thumbnail: String,
medium: String,
large: String
)

case class User(
name: String,
email: String,
admin: Boolean,
countryOfOrigin: Option[String] = None,
avatar: Option[AvatarUrls] = None,
createdOn: Instant,
updatedOn: Instant,
id: UUID
) extends Identified {}

case class UserInput(
name: String,
email: String,
password: String = "",
countryOfOrigin: Option[String] = None,
)

case class UserUpdateInput(
name: Option[String] = None,
email: Option[String] = None,
countryOfOrigin: Option[String] = None,
)

case class LoginInput(email: String, password: String)

case class Recipe(
name: String,
createdBy: User,
tags: Seq[String],
ingredients: Seq[InstructionIngredient],
prepTime: Int,
cookTime: Int,
countryOfOrigin: Option[String],
public: Boolean,
wikiLink: Option[String],
instructions: String, // Quill Delta JSON format
instructionImages: Seq[String] = Seq.empty, // URLs of images embedded in instructions
image: Option[ImageUrls] = None,
servings: Int,
createdOn: Instant,
updatedOn: Instant,
id: UUID
) extends Identified

case class RecipeInput(
name: String,
tags: Seq[String],
ingredients: Seq[RecipeIngredientInput],
prepTime: Int,
cookTime: Int,
countryOfOrigin: Option[String],
public: Boolean,
wikiLink: Option[String],
instructions: String,
)

case class RecipeUpdateInput(
name: Option[String] = None,
tags: Option[Seq[String]] = None,
ingredients: Option[Seq[RecipeIngredientInput]] = None,
prepTime: Option[Int] = None,
cookTime: Option[Int] = None,
countryOfOrigin: Option[String] = None,
public: Option[Boolean] = None,
wikiLink: Option[String] = None,
instructions: Option[String] = None, // Quill Delta JSON format
instructionImages: Option[Seq[String]] = None,
image: Option[ImageUrls] = None,
)

case class Ingredient(
name: String,
aliases: Seq[String],
wikiLink: String,
tags: Seq[String],
createdBy: User,
id: UUID
) extends Wikified
with Identified

case class IngredientInput(
name: String,
aliases: Seq[String],
wikiLink: String,
tags: Seq[String],
)

case class IngredientUpdateInput(
name: Option[String],
aliases: Option[Seq[String]],
wikiLink: Option[String],
tags: Option[Seq[String]],
)

case class InstructionIngredient(
ingredient: Ingredient,
quantity: Quantity,
description: Option[String] = None
)

case class Quantity(
unit: Unit, // Type!
amount: Int
)

enum Unit(val name: String, val isVolume: Boolean, val wikiLink: String) extends Wikified:
case Cup extends Unit("cup", true, "")
case Milliliter extends Unit("milliliter", true, "")
case Liter extends Unit("liter", true, "")
case Teaspoon extends Unit("teaspoon", true, "")
case Tablespoon extends Unit("tablespoon", true, "")
case Piece extends Unit("piece", false, "")
case Gram extends Unit("gram", false, "")
case Kilogram extends Unit("kilogram", false, "")
case Ounce extends Unit("ounce", false, "")
case Pound extends Unit("pound", false, "")

def standardizedUnitName: String = if isVolume then "milliliter" else "gram"
def toStandardizedAmount(amount: Int): Int = Unit.toStandardizedAmount(this, amount)

case class Filters(
id: Option[UUID],
ids: Option[List[UUID]],
belongsToUser: Option[UUID],
savedByUser: Option[UUID],
name: Option[StringFilter],
aliasesOrName: Option[Seq[String]],
email: Option[StringFilter],
prepTime: Option[NumberFilter],
cookTime: Option[NumberFilter],
public: Option[Boolean],
tags: Option[Seq[String]],
ingredients: Option[Seq[String]],
notIngredients: Option[Seq[String]],
analyzedEntity: Option[UUID],
ingredientSimilarity: Option[SimilarityFilter],
coSaveSimilarity: Option[SimilarityFilter],
tagSimilarity: Option[SimilarityFilter],
orderBy: Option[OrderBy],
limit: Option[Int],
page: Option[Int],
)

case class OrderBy(
name: Option[Boolean]
)

case class NumberFilter(
greaterOrEqual: Option[Int],
lessOrEqual: Option[Int]
)

final case class SimilarityFilter(
alpha: Double,
beta: Double,
gamma: Double,
minScore: Double
)

case class StringFilter(
equals: Option[String],
anyOf: Option[Seq[String]],
contains: Option[String],
startsWith: Option[String],
endsWith: Option[String]
)
