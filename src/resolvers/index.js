const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  readJsonFile,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError, printType } = require("graphql");
const crypto = require("crypto");

const axios = require("axios").default;

const cartDirectory = path.join(__dirname, "..", "data", "shoppingcarts");
const productDirectory = path.join(__dirname, "..", "data", "products");

exports.resolvers = {
  Query: {
    getCartById: async (_, args) => {
      // Place the cartId the user sent in a variable called "cartId"
      const cartId = args.cartId;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);

      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await fsPromises.readFile(cartFilePath, {
        encoding: "utf-8",
      });
      const data = JSON.parse(cartData);
      return data;
    },
  },
  Mutation: {
    addItemToCart: async (_, args) => {
      const { cartId, itemId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await fsPromises.readFile(cartFilePath, {
        encoding: "utf-8",
      });

      let sum = 0;

      const data = JSON.parse(cartData);

      let itemInCartExist = false;

      for (let x of data.items) {
        if (x.id === itemId) {
          x.quantity++;
          itemInCartExist = true;
        }
        sum += x.price * x.quantity;
      }

      if (!itemInCartExist) {
        const productFilePath = path.join(productDirectory, `${itemId}.json`);

        // Check if the requested project actually exists
        const productExists = await fileExists(productFilePath);
        // If product does not exist return an error notifying the user of this
        if (!productExists)
          return new GraphQLError("That product does not exist");

        // Read the project file; data will be returned as a JSON string
        const itemData = await fsPromises.readFile(productFilePath, {
          encoding: "utf-8",
        });
        // Parse the returned JSON project data into a JS object
        const productdata = JSON.parse(itemData);
        // Return the data
        data.items.push(productdata);
      }

      data.totalprice = sum;
      await fsPromises.writeFile(cartFilePath, JSON.stringify(data));
      return data;
    },

    createCart: async (_) => {
      const items = [
        { id: crypto.randomUUID(), name: "test", price: 124, quantity: 1 },
        { id: crypto.randomUUID(), name: "test", price: 125, quantity: 1 },
      ];

      const newCart = {
        id: crypto.randomUUID(),
        items: items,
        totalprice: 123,
      };

      let filePath = path.join(
        __dirname,
        "..",
        "data",
        "shoppingcarts",
        `${newCart.id}.json`
      );
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath); // kolla om filen existerar
        console.log(exists, newCart.id);
        // om filen redan existerar generera ett nytt cartId och uppdatera filePath
        if (exists) {
          newCart.id = crypto.randomUUID();
          filePath = path.join(cartDirectory, `${newCart.id}.json`);
        }
        // uppdatera idExists (för att undvika infinite loops)
        idExists = exists;
      }

      // Skapa en fil för cart i /data/projects
      await fsPromises.writeFile(filePath, JSON.stringify(newCart));

      // Return:a våran respons; vår nya shoppingcart
      return newCart;
    },
  },
};
