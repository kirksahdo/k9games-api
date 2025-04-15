/**
 * game service
 */

import { factories } from "@strapi/strapi";
import axios from "axios";
import { JSDOM } from "jsdom";
import moment from "moment";
import slugify from "slugify";

const GAME_SERVICE = "api::game.game";

type Rating = "BR0" | "BR10" | "BR12" | "BR14" | "BR16" | "BR18";

function isRating(value: string): value is Rating {
  return ["BR0", "BR10", "BR12", "BR14", "BR16", "BR18"].includes(value);
}

async function getGameInfo(slug: string) {
  const gogUrl = `https://www.gog.com/en/game/${slug}`;
  const body = await axios.get(gogUrl);
  const dom = new JSDOM(body.data);

  const rawDescription = dom.window.document.querySelector(".description");
  const description = rawDescription.innerHTML;
  const shortDescription = rawDescription.textContent.slice(0, 160);

  const ratingElement = dom.window.document.querySelector(
    ".age-restrictions__icon use",
  );

  const rating = ratingElement
    ? ratingElement.getAttribute("xlink:href").replace("#", "").replace("_", "")
    : "BR0";

  let validatedRating: Rating = "BR0";

  if (isRating(rating)) {
    validatedRating = rating;
  }

  return {
    description,
    shortDescription,
    rating: validatedRating,
  };
}

type EntityService =
  | "api::developer.developer"
  | "api::publisher.publisher"
  | "api::category.category"
  | "api::platform.platform";

async function getByName(name: string, entityService: EntityService) {
  const item = await strapi
    .documents(entityService)
    .findMany({ filters: { name } });

  return item.length > 0 ? item[0] : null;
}

async function create(name: string, entityService: EntityService) {
  const slug = slugify(name, { lower: true, strict: true });
  const item = await getByName(name, entityService);

  if (!item) {
    console.log(`Creating ${entityService} ${name} ${slug}`);
    const result = await strapi.documents(entityService).create({
      data: {
        name,
        slug,
      },
    });
    return result;
  }

  return item;
}

async function createGameSubfields(game) {
  const developers = [],
    publishers = [],
    categories = [],
    platforms = [];
  for (const developer of game.developers) {
    developers.push(await create(developer, "api::developer.developer"));
  }

  for (const publisher of game.publishers) {
    publishers.push(await create(publisher, "api::publisher.publisher"));
  }

  for (const genre of game.genres) {
    categories.push(await create(genre.name, "api::category.category"));
  }

  for (const platform of game.operatingSystems) {
    platforms.push(await create(platform, "api::platform.platform"));
  }

  return { developers, publishers, categories, platforms };
}

async function sendImageToApi({ image, game, field = "cover" }) {
  const { data } = await axios.get(image, { responseType: "arraybuffer" });
  const buffer = Buffer.from(data, "base64");

  const FormData = require("form-data");

  const formData: any = new FormData();

  formData.append("refId", game.id);
  formData.append("ref", `${GAME_SERVICE}`);
  formData.append("field", field);
  formData.append("files", buffer, { filename: `${game.slug}.jpg` });

  console.info(`Uploading ${field} image: ${game.slug}.jpg`);

  await axios({
    method: "POST",
    url: `http://localhost:1337/api/upload/`,
    data: formData,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    },
  });
}

async function uploadGamePhotos(game, createdGame) {
  await sendImageToApi({ image: game.coverHorizontal, game: createdGame });
  await Promise.all(
    game.screenshots.slice(0, 5).map((url) =>
      sendImageToApi({
        image: `${url.replace(
          "{formatter}",
          "product_card_v2_mobile_slider_639",
        )}`,
        game: createdGame,
        field: "gallery",
      }),
    ),
  );
}

async function createGame(game) {
  const { categories, developers, platforms, publishers } =
    await createGameSubfields(game);
  const { description, shortDescription, rating } = await getGameInfo(
    game.slug,
  );

  console.log("Creating game", game.title);

  try {
    const createdGame = await strapi.documents("api::game.game").create({
      data: {
        name: game.title,
        slug: slugify(game.title, { lower: true, strict: true }),
        price: game.price.finalMoney.amount,
        description: description,
        short_description: shortDescription,
        release_date: moment(game.releaseDate, "YYYY.MM.DD").toDate(),
        rating: rating,
        developers: developers,
        publishers: publishers,
        categories: categories,
        platforms: platforms,
      },
    });
    uploadGamePhotos(game, createdGame);
  } catch (error) {
    console.error("Error creating game:", game.title, error);
  }
}

export default factories.createCoreService("api::game.game", () => ({
  populate: async (params) => {
    const gogApiUrl = "https://catalog.gog.com/v1/catalog?order=desc&page=1";

    const {
      data: { products },
    } = await axios.get(gogApiUrl);

    for (const game of products) {
      await createGame(game);
    }
  },
}));
